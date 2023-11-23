import { useWindowSize } from '@/utils/hooks'
import Vertical from './Vertical'
import Horizontal from './Horizontal'
// import { AppColors } from '@/theme'

export default () => {
  const windowSize = useWindowSize()

  return windowSize.height > windowSize.width
    ? <Vertical />
    : <Horizontal />
}
