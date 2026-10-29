import { injectNeosProps } from "./Neos";
import { createThumbnail } from "./Thumbnail";

export { injectNeosProps, createThumbnail };

export function getImageIdentity(getNodeByContextPath, nodeContextPath, imageProperty) {
    let node = getNodeByContextPath(nodeContextPath);
    if (!node) {
        return null;
    }

    if (imageProperty.startsWith("parent:")) {
        imageProperty = imageProperty.replace("parent:", "");
        node = getNodeByContextPath(node.parent);
    }

    return node?.properties?.[imageProperty]?.__identity || null;
}
