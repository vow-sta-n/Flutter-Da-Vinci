// This plugin converts Figma elements to Flutter CustomPainter code with flatten support

figma.showUI(__html__, { width: 520, height: 720 });

// Node types that cannot be flattened
const NON_FLATTENABLE_TYPES: readonly string[] = [
  'SLICE',
  'SECTION'
];

interface VectorPathData {
  index: number;
  data: string;
  windingRule: 'NONZERO' | 'EVENODD' | 'NONE';
}

interface StrokeInfo {
  color: string | null;
  width: number;
  strokeCap?: 'none' | 'round' | 'square';
  strokeJoin?: 'miter' | 'bevel' | 'round';
}

interface VectorPathSuccessResult {
  success: true;
  vectorPaths: VectorPathData[];
  fillColor: string | null;
  strokeInfo: StrokeInfo;
  wasFlattened: boolean;
}

interface VectorPathErrorResult {
  success: false;
  error: string;
}

type ExtractVectorPathsResult = VectorPathSuccessResult | VectorPathErrorResult;

interface SelectionData {
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteX: number;
  absoluteY: number;
  canFlatten?: boolean;
  flattenError?: string;
  vectorPaths?: VectorPathData[];
  hasVectorPaths?: boolean;
  wasFlattened?: boolean;
  fillColor?: string | null;
  strokeInfo?: StrokeInfo;
}

// Helper function to convert RGBA to hex with alpha channel (0xAARRGGBB)
function rgbaToHex(r: number, g: number, b: number, a = 1.0): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `0x${toHex(a)}${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper function to get fill color with alpha
function getFillColor(node: SceneNode): string | null {
  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const { r, g, b } = fill.color;
        const opacity = typeof fill.opacity === 'number' ? fill.opacity : 1.0;
        return rgbaToHex(r, g, b, opacity);
      }
    }
  }
  return null;
}

// Helper function to get stroke color, width, and styling
function getStrokeInfo(node: SceneNode): StrokeInfo {
  let color: string | null = null;
  let width = 0;
  let strokeCap: 'none' | 'round' | 'square' | undefined;
  let strokeJoin: 'miter' | 'bevel' | 'round' | undefined;

  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID' && stroke.visible !== false) {
        const { r, g, b } = stroke.color;
        const opacity = typeof stroke.opacity === 'number' ? stroke.opacity : 1.0;
        color = rgbaToHex(r, g, b, opacity);
        break;
      }
    }
  }

  if ('strokeWeight' in node && typeof node.strokeWeight === 'number') {
    width = node.strokeWeight;
  }

  if ('strokeCap' in node && typeof node.strokeCap === 'string') {
    if (node.strokeCap === 'ROUND') strokeCap = 'round';
    else if (node.strokeCap === 'SQUARE') strokeCap = 'square';
    else strokeCap = 'none';
  }

  if ('strokeJoin' in node && typeof node.strokeJoin === 'string') {
    if (node.strokeJoin === 'ROUND') strokeJoin = 'round';
    else if (node.strokeJoin === 'BEVEL') strokeJoin = 'bevel';
    else strokeJoin = 'miter';
  }

  return { color, width, strokeCap, strokeJoin };
}

// Function to extract vector paths using flatten (without modifying original)
function extractVectorPaths(node: SceneNode): ExtractVectorPathsResult {
  let clone: SceneNode | null = null;
  let flattenedNode: VectorNode | null = null;

  try {
    // Clone the node
    clone = node.clone();

    // Add clone to the page temporarily (required for flatten)
    figma.currentPage.appendChild(clone);

    // Flatten using figma.flatten() - returns a single VectorNode or null
    try {
      flattenedNode = figma.flatten([clone]);
      clone = null; // Flattening consumed or detached the clone
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to flatten';
      return {
        success: false,
        error: `Unable to flatten: ${errorMsg}`
      };
    }

    // Check if flatten was successful
    if (!flattenedNode) {
      return {
        success: false,
        error: 'Flatten returned no result. Element may be empty or invalid.'
      };
    }

    // Extract vector paths from flattened node
    if ('vectorPaths' in flattenedNode && flattenedNode.vectorPaths.length > 0) {
      const vectorPaths: VectorPathData[] = flattenedNode.vectorPaths.map((path, index) => ({
        index: index,
        data: path.data,
        windingRule: path.windingRule
      }));

      // Get colors and strokes from flattened node
      const fillColor = getFillColor(flattenedNode);
      const strokeInfo = getStrokeInfo(flattenedNode);

      return {
        success: true,
        vectorPaths: vectorPaths,
        fillColor: fillColor,
        strokeInfo: strokeInfo,
        wasFlattened: true
      };
    } else {
      return { success: false, error: 'No vector paths found after flattening' };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Unexpected error: ${errorMsg}` };
  } finally {
    // Clean up temporary nodes
    if (clone) {
      try {
        clone.remove();
      } catch (_e) {
        // Node already removed or detached
      }
    }
    if (flattenedNode) {
      try {
        flattenedNode.remove();
      } catch (_e) {
        // Node already removed
      }
    }
  }
}

// Function to gather and send selection data to UI
function sendSelectionData(): void {
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
  const data: SelectionData = {
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
  if (NON_FLATTENABLE_TYPES.indexOf(node.type) !== -1) {
    data.canFlatten = false;
    data.flattenError = `${node.type} elements cannot be converted to vector paths`;
    figma.ui.postMessage({
      type: 'selection-data',
      data: data
    });
    return;
  }

  // Try to get vector paths (with flatten if necessary)
  if ('vectorPaths' in node && Array.isArray(node.vectorPaths) && node.vectorPaths.length > 0) {
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

// Send initial selection data when plugin opens
sendSelectionData();

// Listen for selection changes
figma.on('selectionchange', () => {
  sendSelectionData();
});

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