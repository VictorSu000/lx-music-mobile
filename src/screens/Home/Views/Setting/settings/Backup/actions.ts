import { LIST_IDS } from '@/config/constant'
import { createList, getListMusics, overwriteList, overwriteListFull, overwriteListMusics } from '@/core/list'
import { filterMusicList, fixNewMusicInfoQuality, toNewMusicInfo } from '@/utils'
import { log } from '@/utils/log'
import { confirmDialog, handleReadFile, handleSaveFile, showImportTip, toast } from '@/utils/tools'
import listState from '@/store/list/state'
import { webdavTempPath, uploadLxConfigFileWebDAV, downloadLxConfigFileWebDAV, delWebdavTempFile } from './webdav_util'
import { DownloadDirectoryPath } from 'react-native-fs'
import { PermissionsAndroid } from 'react-native'


const getAllLists = async () => {
  const lists = []
  lists.push(await getListMusics(listState.defaultList.id).then(musics => ({ ...listState.defaultList, list: musics })))
  lists.push(await getListMusics(listState.loveList.id).then(musics => ({ ...listState.loveList, list: musics })))

  for await (const list of listState.userList) {
    lists.push(await getListMusics(list.id).then(musics => ({ ...list, list: musics })))
  }

  return lists
}
const importOldListData = async (lists: any[]) => {
  const allLists = await getAllLists()
  for (const list of lists) {
    try {
      const targetList = allLists.find(l => l.id == list.id)
      if (targetList) {
        targetList.list = filterMusicList((list.list as any[]).map(m => toNewMusicInfo(m)))
      } else {
        const listInfo = {
          name: list.name,
          id: list.id,
          list: filterMusicList((list.list as any[]).map(m => toNewMusicInfo(m))),
          source: list.source,
          sourceListId: list.sourceListId,
          locationUpdateTime: list.locationUpdateTime ?? null,
        }
        allLists.push(listInfo as LX.List.UserListInfoFull)
      }
    } catch (err) {
      console.log(err)
    }
  }
  const defaultList = allLists.shift()!.list
  const loveList = allLists.shift()!.list
  await overwriteListFull({ defaultList, loveList, userList: allLists as LX.List.UserListInfoFull[] })
}
const importNewListData = async (lists: Array<LX.List.MyDefaultListInfoFull | LX.List.MyLoveListInfoFull | LX.List.UserListInfoFull>, merge: boolean = false) => {
  const allLists = await getAllLists()
  for (const list of lists) {
    try {
      const targetList = allLists.find(l => l.id == list.id)
      if (targetList) {
        const newList = filterMusicList(list.list).map(m => fixNewMusicInfoQuality(m))
        if (!merge) {
          // 直接覆盖
          targetList.list = newList
        } {
          // 合并
          const targetIDSet = new Set(targetList.list.map(x => x.id))
          const notExisted = newList.filter(x => !targetIDSet.has(x.id))
          if (notExisted.length > 0 && targetList.id !== 'default' && targetList.id !== 'love') {
            const confirm = await confirmDialog({
              message: `“${targetList.name}”有${notExisted.length}首歌将被导入，分别为：${notExisted.map(x => x.name + '-' + x.singer).join('、')}`,
              cancelButtonText: '不用了',
              confirmButtonText: '好的',
            })
            if (confirm) targetList.list.unshift(...notExisted)
          }
        }
      } else {
        const data = {
          name: list.name,
          id: list.id,
          list: filterMusicList(list.list).map(m => fixNewMusicInfoQuality(m)),
          source: (list as LX.List.UserListInfoFull).source,
          sourceListId: (list as LX.List.UserListInfoFull).sourceListId,
          locationUpdateTime: (list as LX.List.UserListInfoFull).locationUpdateTime ?? null,
        }
        allLists.push(data as LX.List.UserListInfoFull)
      }
    } catch (err) {
      console.log(err)
    }
  }
  const defaultList = allLists.shift()!.list
  const loveList = allLists.shift()!.list
  await overwriteListFull({ defaultList, loveList, userList: allLists as LX.List.UserListInfoFull[] })
}

/**
 * 导入单个列表
 * @param listData
 * @param position
 * @returns
 */
export const handleImportListPart = async (listData: LX.ConfigFile.MyListInfoPart['data'], position: number = listState.userList.length) => {
  const targetList = listState.allList.find(l => l.id === listData.id)
  if (targetList) {
    const confirm = await confirmDialog({
      message: global.i18n.t('list_import_part_confirm', { importName: listData.name, localName: targetList.name }),
      cancelButtonText: global.i18n.t('list_import_part_button_cancel'),
      confirmButtonText: global.i18n.t('list_import_part_button_confirm'),
      bgClose: false,
    })
    if (confirm) {
      listData.name = targetList.name
      void overwriteList(listData)
      toast(global.i18n.t('setting_backup_part_import_list_tip_success'))
      return
    }
    listData.id += `__${Date.now()}`
  }
  const userList = listData as LX.List.UserListInfoFull
  void createList({
    name: userList.name,
    id: userList.id,
    list: userList.list,
    source: userList.source,
    sourceListId: userList.sourceListId,
    position: Math.max(position, -1),
  }).then(() => {
    toast(global.i18n.t('setting_backup_part_import_list_tip_success'))
  }).catch((err) => {
    log.error(err)
    toast(global.i18n.t('setting_backup_part_import_list_tip_error'))
  })
}

const importPlayList = async (path: string, merge: boolean = false) => {
  let configData: any
  try {
    if (path === "--") {
      await delWebdavTempFile()
      path = webdavTempPath
      await downloadLxConfigFileWebDAV(merge)

      // 导入前先备份一下当前数据
      // 请求权限，将数据保存到download文件夹
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: '请求权限',
          message:
            '将备份文件保存到下载文件夹，必须授予',
          buttonPositive: '确认',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw "写入存储的权限未授予"
      }
      const dateStr = new Date().toLocaleString('zh', {
        hour12: false,
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\/|:|\s/g, '-')

      const backupPath = `${DownloadDirectoryPath}/lx_list_${dateStr}.bak.lxmc`
      await exportAllList(backupPath)
      console.log('backup playlist before import from webDAV:', backupPath)
    }
    configData = await handleReadFile(path)
  } catch (error: any) {
    log.error(error.stack)
    throw error
  }

  switch (configData.type) {
    case 'defautlList': // 兼容0.6.2及以前版本的列表数据
      await overwriteListMusics(LIST_IDS.DEFAULT, filterMusicList((configData.data as LX.List.MyDefaultListInfoFull).list.map(m => toNewMusicInfo(m))))
      break
    case 'playList':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await importOldListData(configData.data)
      break
    case 'playList_v2':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await importNewListData(configData.data, merge)
      break
    case 'allData':
      // 兼容0.6.2及以前版本的列表数据
      if (configData.defaultList) await overwriteListMusics(LIST_IDS.DEFAULT, filterMusicList((configData.defaultList as LX.List.MyDefaultListInfoFull).list.map(m => toNewMusicInfo(m))))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      else await importOldListData(configData.playList)
      break
    case 'allData_v2':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await importNewListData(configData.playList)
      break
    case 'playListPart':
      configData.data.list = filterMusicList((configData.data as LX.ConfigFile.MyListInfoPart['data']).list.map(m => toNewMusicInfo(m)))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      void handleImportListPart(configData.data)
      return true
    case 'playListPart_v2':
      configData.data.list = filterMusicList((configData.data as LX.ConfigFile.MyListInfoPart['data']).list).map(m => fixNewMusicInfoQuality(m))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      void handleImportListPart(configData.data)
      return true
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    default: showImportTip(configData.type)
  }

  if (path === webdavTempPath) {
    await delWebdavTempFile()
  }
}

export const handleImportList = (path: string, merge: boolean = false) => {
  console.log(path)
  toast(global.i18n.t('setting_backup_part_import_list_tip_unzip'))
  void importPlayList(path, merge).then((skipTip) => {
    if (skipTip) return
    toast(global.i18n.t('setting_backup_part_import_list_tip_success'))
  }).catch((err) => {
    log.error(err)
    toast(global.i18n.t('setting_backup_part_import_list_tip_error'))
  })
}


const exportAllList = async (path: string, merge: boolean = false) => {
  const data = JSON.parse(JSON.stringify({
    type: 'playList_v2',
    data: await getAllLists(),
  }))

  try {
    if (path === "--") {
      path = webdavTempPath
    } else if (!path.endsWith(".bak.lxmc")) {
      path += '/lx_list.lxmc'
    }
    await handleSaveFile(path, data)
    if (path === webdavTempPath) {
      await uploadLxConfigFileWebDAV(merge)
      await delWebdavTempFile()
    }
  } catch (error: any) {
    log.error(error.stack)
    throw error
  }
}
export const handleExportList = (path: string, merge: boolean = false) => {
  toast(global.i18n.t('setting_backup_part_export_list_tip_zip'))
  void exportAllList(path, merge).then(() => {
    toast(global.i18n.t('setting_backup_part_export_list_tip_success'))
  }).catch((err: any) => {
    log.error(err.message)
    toast(global.i18n.t('setting_backup_part_export_list_tip_failed') + ': ' + (err.message as string))
  })
}
