import { Dimensions, StatusBar } from 'react-native'
import { getWindowSize } from './nativeModules/utils'
// import { log } from './log'

export type SizeHandler = (size: { width: number, height: number }) => void
export const windowSizeTools = {
  size: {
    width: 0,
    height: 0,
  },
  listeners: [] as SizeHandler[],
  getSize() {
    return this.size
  },
  onSizeChanged(handler: SizeHandler) {
    this.listeners.push(handler)

    return () => {
      this.listeners.splice(this.listeners.indexOf(handler), 1)
    }
  },
  async init() {
    Dimensions.addEventListener('change', () => {
      void getWindowSize().then((size) => {
        if (!size.width) return
        const scale = Dimensions.get('screen').scale
        size.width = Math.round(size.width / scale)
        size.height = Math.round(size.height / scale) + (StatusBar.currentHeight ?? 0)
        this.size = size
        for (const handler of this.listeners) handler(size)
      })
    })
    const size = await getWindowSize()
    // log.info('win size', size)
    if (size.width) {
      const scale = Dimensions.get('screen').scale
      size.width = Math.round(size.width / scale)
      size.height = Math.round(size.height / scale) + (StatusBar.currentHeight ?? 0)
      this.size = size
    } else {
      const window = Dimensions.get('window')
      // log.info('Dimensions window size', window)
      this.size = {
        width: Math.round(window.width),
        height: Math.round(window.height) + (StatusBar.currentHeight ?? 0),
      }
    }
    // console.log('init windowSizeTools')
    return size
  },
}
