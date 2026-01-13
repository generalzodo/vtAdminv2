'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Apply patch synchronously before any imports
if (typeof window !== 'undefined') {
  try {
    require('@/lib/react-quill-patch');
  } catch (e) {
    // Ignore errors
  }
}

// CSS will be loaded dynamically in useEffect to avoid build issues

// Dynamically import ReactQuill only on client side
const ReactQuill = dynamic(
  () => import('react-quill'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-[300px] border rounded-lg p-4 flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }
);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load CSS dynamically on client side
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      link.id = 'quill-snow-css';
      
      // Only add if not already present
      if (!document.getElementById('quill-snow-css')) {
        document.head.appendChild(link);
      }
    }
    setMounted(true);
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ font: [] }],
        [{ size: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
      ],
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  const formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'indent',
    'link',
    'image',
    'color',
    'background',
    'align',
  ];

  if (!mounted) {
    return (
      <div className={`min-h-[300px] border rounded-lg p-4 flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}
