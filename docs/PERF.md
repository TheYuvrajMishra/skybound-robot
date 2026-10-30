# Performance budget

- Robots pooled to 40, bullets pooled to 120, enemies pooled by kind, no per-frame allocations in hot paths (pools reused, no new arrays in the render loop except formation slots, which are small and bounded).
- Draw calls: road tiles 14, decor ~16, robots <=40, enemies pooled, bullets <=120 small meshes. Target <150 on high quality.
- Pixel ratio capped at 2, shadow map 1024, shadows only from the directional light.
- Memory soak note: restart 20 times was not run as an automated soak in this session; restart resets sim entities and pools are reused, and GameCanvas cleanup disposes the renderer on unmount. Treat the 20-restart soak as an open verification item, not a claimed pass.
