import { BufferAttribute, BufferGeometry } from "https://cdn.jsdelivr.net/npm/three@0.158.0/+esm";
import { MeshBVH } from "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.6.8/+esm";

onmessage = function ({ data }) {
    let prevTime = performance.now();
    function onProgressCallback(progress) {
        const currTime = performance.now();
        if (currTime - prevTime >= 10 || progress === 1.0) {
            postMessage({
                error: null,
                serialized: null,
                position: null,
                progress,
            });
            prevTime = currTime;
        }
    }

    const { index, position, options } = data;
    try {
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(position, 3, false));
        if (index) {
            geometry.setIndex(new BufferAttribute(index, 1, false));
        }

        if (options.includedProgressCallback) {
            options.onProgress = onProgressCallback;
        }

        if (options.groups) {
            const groups = options.groups;
            for (const i in groups) {
                const group = groups[i];
                geometry.addGroup(group.start, group.count, group.materialIndex);
            }
        }

        const bvh = new MeshBVH(geometry, options);
        const serialized = MeshBVH.serialize(bvh, { copyIndexBuffer: false });
        const toTransfer = [serialized.index.buffer, position.buffer, ...serialized.roots].filter(
            (v) => typeof SharedArrayBuffer === "undefined" || !(v instanceof SharedArrayBuffer),
        );

        if (bvh._indirectBuffer) {
            toTransfer.push(serialized.indirectBuffer.buffer);
        }

        postMessage(
            {
                error: null,
                serialized,
                position,
                progress: 1,
            },
            toTransfer,
        );
    } catch (error) {
        postMessage({
            error,
            serialized: null,
            position: null,
            progress: 1,
        });
    }
};
