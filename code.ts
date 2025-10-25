// This plugin converts Figma elements to Flutter CustomPainter code with flatten support

figma.showUI(__html__, { width: 500, height: 700 });

// Node types that can be flattened
const FLATTENABLE_TYPES = [
  'FRAME',
  'GROUP',
  'COMPONENT',
  'INSTANCE',
  'BOOLEAN_OPERATION',
  'VECTOR',
  'STAR',
  'LINE',
  'ELLIPSE',
  'POLYGON',
  'RECTANGLE',
  'TEXT'
];

// Node types that cannot be flattened
const NON_FLATTENABLE_TYPES = [
  'SLICE',
  'SECTION'
];

// Send initial selection data when plugin opens
sendSelectionData();

// Listen for selection changes
figma.on('selectionchange', () => {
  sendSelectionData();
});

// Helper function to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `0xFF${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Helper function to get fill color
function getFillColor(node: any): string | null {
  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.visible !== false) {
      const { r, g, b } = fill.color;
      return rgbToHex(r, g, b);
    }
  }
  return null;
}

// Helper function to get stroke color and width
function getStrokeInfo(node: any): { color: string | null, width: number } {
  let color = null;
  let width = 0;
  
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.visible !== false) {
      const { r, g, b } = stroke.color;
      color = rgbToHex(r, g, b);
    }
  }
  
  if ('strokeWeight' in node) {
    width = node.strokeWeight;
  }
  
  return { color, width };
}

// Function to extract vector paths using flatten (without modifying original)
function extractVectorPaths(node: SceneNode): any {
  try {
    // Clone the node
    const clone = node.clone();
    
    // Add clone to the page temporarily (required for flatten)
    figma.currentPage.appendChild(clone);
    
    // Flatten using figma.flatten() - returns a single VectorNode or null
    let flattenedNode: VectorNode | null;
    try {
      flattenedNode = figma.flatten([clone]);
    } catch (error) {
      clone.remove();
      const errorMsg = error instanceof Error ? error.message : 'Failed to flatten';
      return { 
        success: false, 
        error: `Unable to flatten: ${errorMsg}` 
      };
    }
    
    // Check if flatten was successful
    if (!flattenedNode) {
      clone.remove();
      return { 
        success: false, 
        error: 'Flatten returned no result. Element may be empty or invalid.' 
      };
    }
    
    // Extract vector paths from flattened node
    if ('vectorPaths' in flattenedNode && flattenedNode.vectorPaths.length > 0) {
      const vectorPaths = flattenedNode.vectorPaths.map((path, index) => ({
        index: index,
        data: path.data,
        windingRule: path.windingRule
      }));
      
      // Get colors from flattened node
      const fillColor = getFillColor(flattenedNode);
      const strokeInfo = getStrokeInfo(flattenedNode);
      
      // Clean up - remove the flattened node
      flattenedNode.remove();
      
      return {
        success: true,
        vectorPaths: vectorPaths,
        fillColor: fillColor,
        strokeInfo: strokeInfo,
        wasFlattened: true
      };
    } else {
      flattenedNode.remove();
      return { success: false, error: 'No vector paths found after flattening' };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Unexpected error: ${errorMsg}` };
  }
}

// Function to gather and send selection data to UI
function sendSelectionData() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'no-selection',
      message: 'No element selected'
    });
    return;
  }
  
  if (selection.length > 1) {
    figma.ui.postMessage({
      type: 'multiple-selection',
      count: selection.length,
      message: `${selection.length} elements selected`
    });
    return;
  }
  
  // Single element selected
  const node = selection[0];
  
  // Base data for all nodes
  const data: any = {
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    absoluteX: node.absoluteTransform[0][2],
    absoluteY: node.absoluteTransform[1][2]
  };
  
  // Check if this node type cannot be flattened
  if (NON_FLATTENABLE_TYPES.includes(node.type)) {
    data.canFlatten = false;
    data.flattenError = `${node.type} elements cannot be converted to vector paths`;
    figma.ui.postMessage({
      type: 'selection-data',
      data: data
    });
    return;
  }
  
  // Try to get vector paths (with flatten if necessary)
  if ('vectorPaths' in node && node.vectorPaths.length > 0) {
    // Node already has vector paths - use them directly
    data.vectorPaths = node.vectorPaths.map((path, index) => ({
      index: index,
      data: path.data,
      windingRule: path.windingRule
    }));
    data.hasVectorPaths = true;
    data.wasFlattened = false;
    data.fillColor = getFillColor(node);
    data.strokeInfo = getStrokeInfo(node);
  } else {
    // Try to flatten and extract vector paths
    const result = extractVectorPaths(node);
    
    if (result.success) {
      data.vectorPaths = result.vectorPaths;
      data.hasVectorPaths = true;
      data.wasFlattened = result.wasFlattened;
      data.fillColor = result.fillColor;
      data.strokeInfo = result.strokeInfo;
    } else {
      data.hasVectorPaths = false;
      data.flattenError = result.error;
    }
  }
  
  figma.ui.postMessage({
    type: 'selection-data',
    data: data
  });
}

// Handle messages from UI
figma.ui.onmessage = (msg: { type: string }) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
  
  if (msg.type === 'refresh') {
    sendSelectionData();
  }
  
  if (msg.type === 'copy-code') {
    figma.notify('Flutter code copied to clipboard!');
  }
};