import { connect } from 'react-redux'
import Counter from './component'
import { Action, actions } from './ducks'
import { Model } from '../ducks'

type Dispatch = (a: Action) => void
const mapDispatchToProps = (dispatch: Dispatch) => ({
  increment: () => dispatch(actions.increment()),
  decrement: () => dispatch(actions.decrement()),
})
const mapStateToProps = (state: Model) => ({ state: state.get('counter') })

export default connect(mapStateToProps, mapDispatchToProps)(Counter)
