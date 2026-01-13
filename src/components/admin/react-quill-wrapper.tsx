'use client';

// This wrapper ensures the React 19 patch is loaded before react-quill
import { useEffect, useState } from 'react';

// Load the patch first
if (typeof window !== 'undefined') {
  require('@/lib/react-quill-patch');
}

// Now dynamically import react-quill
const ReactQuill = require('react-quill').default;

export default ReactQuill;
