import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Intro } from '@/entrypoints/page/intro';
import './App.css';

const router = createBrowserRouter([
  {
    path: '/page.html',
    element: <Intro />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
