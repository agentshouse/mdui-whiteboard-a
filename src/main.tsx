import React from 'react';
import { createRoot } from 'react-dom/client';
import { Whiteboard } from './Whiteboard';
import './style.css';
const root = document.getElementById('root');
if (!root) throw new Error('Whiteboard root is missing');
createRoot(root).render(<Whiteboard ownerDocument={root.ownerDocument} />);
