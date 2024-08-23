import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Intro } from '@/entrypoints/page/intro';
import { ProgressScreen } from '@/entrypoints/page/progress';
import './App.css';

const router = createBrowserRouter([
  {
    path: '/page.html',
    element: <Intro />,
  },
  {
    path: '/progress',
    element: <ProgressScreen />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
