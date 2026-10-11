/**
 * src/components/PortalLayout.jsx
 * Enterprise Sidebar Layout.
 * Renders the persistent Left Sidebar with all 9 regulatory navigation items,
 * and the TopBar + Page Content on the right.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const PortalLayout = () => {
  return (
    <div className="portal-layout" id="portal-root-layout">
      {/* 1. Left Vertical Sidebar (Permanent) */}
      <Sidebar />

      {/* 2. Main Workspace Area (Right) */}
      <div className="portal-main-area">
        <TopBar />
        <main className="portal-content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
