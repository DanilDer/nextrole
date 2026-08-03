import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import './Layout.css';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="layout-main">
        <Outlet />
      </main>
    </>
  );
}
