import RNFS from 'react-native-fs'
import RNFetchBlob from "rn-fetch-blob";
import { temporaryDirectoryPath } from '@/utils/fs'

// TODO 填上URL、用户名密码
const webdavFileURL = ""
const webdavMergeFileURL = ""
const username = ""
const password = ""

export const webdavTempPath = `${temporaryDirectoryPath}/lx_list_tmp_webdav.lxmc`


export const uploadLxConfigFileWebDAV = async (useMergeFile: boolean = false) => {
    const link = useMergeFile ? webdavMergeFileURL : webdavFileURL
    const res = await RNFetchBlob.config({
        path: webdavTempPath,
    }).fetch("put", link, {
        "Authorization": `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        "Content-Type": "application/octet-stream",
    }, RNFetchBlob.wrap(webdavTempPath))
    if ((res.info().status !== 204) && (res.info().status !== 201)) {
        console.error(`link ${link}, res ${JSON.stringify(res.info())}`)
        throw `upload statusCode ${res.info().status}`
    }
}

export const downloadLxConfigFileWebDAV = async (useMergeFile: boolean = false) => {
    let link = useMergeFile ? webdavMergeFileURL : webdavFileURL
    const res = await RNFetchBlob.config({
        path: webdavTempPath,
    }).fetch("get", link, {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    })
    if (res.info().status !== 200) {
        console.error(`link ${link}, res ${JSON.stringify(res.info())}`)
        throw `download statusCode ${res.info().status}`
    }
}

export const delWebdavTempFile = async () => {
    if (await RNFS.exists(webdavTempPath)) {
        await RNFS.unlink(webdavTempPath)
    }
}
