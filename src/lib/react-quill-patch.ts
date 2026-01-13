// React 19 compatibility patch for react-quill
// This patches findDOMNode which was removed in React 19

if (typeof window !== 'undefined') {
  try {
    const ReactDOM = require('react-dom');
    const ReactDOMClient = require('react-dom/client');
    
    // Polyfill findDOMNode for React 19 - patch both the default export and named export
    const findDOMNodePolyfill = function(node: any): Element | Text | null {
      if (node == null) {
        return null;
      }
      // If it's already a DOM node, return it
      if (node.nodeType === 1 || node.nodeType === 3) {
        return node;
      }
      // Handle refs
      if (typeof node === 'object' && 'current' in node) {
        return node.current;
      }
      // Try to get the DOM node from React internals
      if (node && typeof node === 'object') {
        // Check for React 18+ fiber structure
        const fiber = (node as any)._reactInternalFiber || (node as any)._reactInternalInstance || (node as any).__reactInternalInstance;
        if (fiber) {
          let current = fiber;
          while (current) {
            if (current.stateNode && (current.stateNode.nodeType === 1 || current.stateNode.nodeType === 3)) {
              return current.stateNode;
            }
            current = current.return;
          }
        }
        // Fallback: try to find a DOM node in the component
        if ((node as any).getDOMNode) {
          return (node as any).getDOMNode();
        }
      }
      return null;
    };
    
    // Add to ReactDOM if it doesn't exist
    if (!ReactDOM.findDOMNode) {
      (ReactDOM as any).findDOMNode = findDOMNodePolyfill;
    }
    
    // Also patch ReactDOMClient if it exists
    if (ReactDOMClient && !ReactDOMClient.findDOMNode) {
      (ReactDOMClient as any).findDOMNode = findDOMNodePolyfill;
    }
    
    // Patch the module exports
    if (typeof module !== 'undefined' && module.exports) {
      if (!module.exports.findDOMNode) {
        module.exports.findDOMNode = findDOMNodePolyfill;
      }
    }
  } catch (e) {
    console.warn('Failed to patch ReactDOM.findDOMNode:', e);
  }
}
