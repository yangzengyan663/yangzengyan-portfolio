import StrokeText from './components/StrokeText'
import FoldText from './components/FoldText'

export default function ProfileTextEffects({ kind, ...props }) {
  return kind === 'stroke' ? <StrokeText {...props} /> : <FoldText {...props} />
}
