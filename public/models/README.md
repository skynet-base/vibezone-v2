# 3D Models

Place `.glb` files here for automatic GLTF model loading.

## Expected Files
- `tower.glb` — Desktop/Tower PC model (for PC1, PC2)
- `laptop.glb` — Laptop model (for PC4)
- `server.glb` — Server rack model (for VPS)

## Where to Find Models
- **Sketchfab**: https://sketchfab.com (search "gaming pc tower", "laptop", "server rack")
- Download as **glTF Binary (.glb)** format
- Rename to match the expected filenames above

## How It Works
`DeviceModel.tsx` auto-detects: if a `.glb` file exists here, it loads the GLTF model.
If no file exists, it falls back to procedural Three.js geometries (which always work).
