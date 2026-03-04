import MainApp from './MainApp';
import ResetPassword from '../components/ResetPassword';

const App = () => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  if (path === '/reset-password') {
    return <ResetPassword />;
  }

  return <MainApp />;
};

export default App;
