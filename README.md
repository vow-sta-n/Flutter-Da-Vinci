# 🎨Flutter Da Vinci Art to Code

> Transform your Figma designs into beautiful, responsive Flutter code with a single click!

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Figma](https://img.shields.io/badge/Figma-Plugin-purple.svg)
![Flutter](https://img.shields.io/badge/Flutter-Ready-02569B.svg)

## ✨ What is Flutter Da Vinci?

Da Vinci is a powerful Figma plugin that converts your vector designs into production-ready Flutter `CustomPainter` code. Whether you're designing icons, illustrations, or custom UI elements, Da Vinci makes it effortless to bring your designs to life in Flutter.

## 🚀 Features

### 🎯 Smart Vector Conversion

- **Native Vector Support** - Works with all Figma vector shapes (stars, polygons, rectangles, etc.)
- **Auto-Flatten** - Automatically flattens complex designs (groups, boolean operations, components) without modifying your canvas
- **Multi-Path Support** - Handles complex shapes with multiple vector paths

### 📱 Responsive by Default

- **Automatic Scaling** - Generated code scales beautifully to any screen size
- **Aspect Ratio Preservation** - Maintains original design proportions
- **Responsive Strokes** - Stroke widths scale proportionally

### 🎨 Complete Styling

- **Fill Colors** - Extracts and converts fill colors to Flutter Color codes
- **Stroke Support** - Includes stroke colors and widths
- **Multiple Paths** - Handles complex shapes with multiple vector paths

### 💻 Developer Friendly

- **Clean Code Generation** - Produces readable, well-structured Flutter code
- **Copy to Clipboard** - One-click copy for instant use
- **Usage Examples** - Includes code snippets showing how to use the generated painter
- **Syntax Highlighting** - Beautiful code preview in dark theme

## 📦 Installation

### Prerequisites

1. **Node.js & NPM** - [Download here](https://nodejs.org/en/download/)
2. **TypeScript** - Install globally:
   ```bash
   npm install -g typescript
   ```

### Setup

1. Clone or download this plugin
2. Navigate to the plugin directory
3. Install dependencies:
   ```bash
   npm install --save-dev @figma/plugin-typings
   ```

### Running the Plugin

#### Option 1: Visual Studio Code (Recommended)

1. Open this directory in VS Code
2. Run `Terminal > Run Build Task...`
3. Select `npm: watch`
4. VS Code will automatically compile TypeScript on save

#### Option 2: Command Line

```bash
# Watch mode (auto-compile on changes)
tsc --watch

# Or compile once
tsc
```

### Load in Figma

1. Open Figma Desktop App
2. Go to `Plugins > Development > Import plugin from manifest...`
3. Select the `manifest.json` file from this directory
4. Run via `Plugins > Development > Da Vinci Art to Code`

## 🎯 How to Use

### Basic Usage

1. **Select** any vector element in Figma
2. **Run** the Da Vinci plugin
3. **Copy** the generated Flutter code
4. **Paste** into your Flutter project

### Supported Elements

#### ✅ Direct Support (No Flatten Needed)

- Vector shapes
- Stars
- Polygons
- Rectangles
- Ellipses
- Lines
- Text (as outlines)

#### ✅ Auto-Flatten Support

- Frames with multiple layers
- Groups
- Boolean operations (Union, Subtract, Intersect, Exclude)
- Components & Instances
- Complex nested designs

#### ❌ Not Supported

- Slices
- Sections
- Empty elements

## 💡 Example Output

### Input: A Star Shape in Figma

### Output: Flutter Code

```dart
import 'package:flutter/material.dart';

class StarPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Original design size from Figma
    const originalWidth = 100.0;
    const originalHeight = 100.0;

    // Calculate scale factors to make it responsive
    final scaleX = size.width / originalWidth;
    final scaleY = size.height / originalHeight;
    final scale = scaleX < scaleY ? scaleX : scaleY;

    final fillPaint = Paint()
      ..color = Color(0xFFFF8000)
      ..style = PaintingStyle.fill;

    // Save canvas state and apply scaling
    canvas.save();
    canvas.scale(scale, scale);

    final path = Path();
    path.moveTo(50.00, 0.00);
    path.lineTo(61.00, 35.00);
    path.lineTo(98.00, 35.00);
    // ... more path commands
    path.close();

    canvas.drawPath(path, fillPaint);

    // Restore canvas state
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Usage Example:
// CustomPaint(
//   size: Size(200, 200), // Any size - will scale automatically!
//   painter: StarPainter(),
// )
```

## 🛠️ Technical Details

### SVG Path to Flutter Conversion

Da Vinci intelligently converts SVG path commands to Flutter Path API:

| SVG Command         | Flutter Method                                        | Notes                                      |
| ------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `M x y` / `m dx dy` | `path.moveTo(x, y)`                                   | Move pen (chained coords act as lineTo)    |
| `L x y` / `l dx dy` | `path.lineTo(x, y)`                                   | Straight line segment                      |
| `H x` / `h dx`      | `path.lineTo(x, currentY)`                            | Horizontal line (maintains current Y)      |
| `V y` / `v dy`      | `path.lineTo(currentX, y)`                            | Vertical line (maintains current X)        |
| `C ...` / `c ...`   | `path.cubicTo(cp1x, cp1y, cp2x, cp2y, endX, endY)`    | Cubic Bezier curve                         |
| `S ...` / `s ...`   | `path.cubicTo(...)`                                   | Smooth Cubic Bezier (control point reflect)|
| `Q ...` / `q ...`   | `path.quadraticBezierTo(cp1x, cp1y, endX, endY)`      | Quadratic Bezier curve                     |
| `T ...` / `t ...`   | `path.quadraticBezierTo(...)`                         | Smooth Quadratic Bezier (CP reflect)       |
| `A ...` / `a ...`   | `path.arcToPoint(...)`                                | Elliptical Arc to point with radius        |
| `Z` / `z`           | `path.close()`                                        | Closes subpath & resets origin             |

### Winding Rules & Fill Types

- **`EVENODD`**: Automatically configured with `path.fillType = PathFillType.evenOdd;` so shapes with cutouts (like donut shapes, gears, and typography) render cleanly.
- **`NONZERO`**: Standard solid fill mode.

### Flutter Code Modes

1. **`CustomPainter`**: Generates a responsive, aspect-ratio-preserving `CustomPainter` with optional constructor color parameter.
2. **`Widget Component`**: Generates a drop-in `StatelessWidget` (e.g. `CustomGraphicWidget(size, color)`) wrapping the painter in a `CustomPaint`.
3. **`Path Code Only`**: Generates pure `Path` setup statements for embedding directly into existing canvas drawing logic.

## 🤝 Contributing

Found a bug or have a feature request? Feel free to open an issue or submit a pull request!

## 📝 Development Notes

### Project Structure

```
da-vinci-plugin/
├── manifest.json      # Plugin manifest
├── code.ts           # Main plugin logic (TypeScript)
├── code.js           # Compiled JavaScript (auto-generated)
├── ui.html           # Plugin UI interface with Live Preview & Code Gen
├── tsconfig.json     # TypeScript configuration
├── package.json      # Project metadata & scripts
└── README.md         # Documentation
```

## 📄 License

MIT License - Feel free to use in your projects!

## 🌟 Credits

Created with ❤️ for the Flutter and Figma communities by Novaturients

Check our website: [Novaturients](https://novaturients.in)

---

**Made with Flutter** 💙 | **Powered by Figma** 🎨

_Transform design into code, beautifully._
