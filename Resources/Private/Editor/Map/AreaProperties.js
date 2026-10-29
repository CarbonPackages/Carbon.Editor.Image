export function getAreaProperties(config = {}, options = {}) {
    const properties = { ...config, ...options };
    return Object.fromEntries(
        Object.entries(properties).filter(([name, definition]) => {
            if (definition === null) {
                return false;
            }
            if (name === "shape" || name === "coords") {
                throw new Error(`Image map area property "${name}" is reserved.`);
            }
            if (!definition || typeof definition !== "object" || typeof definition.editor !== "string") {
                throw new Error(`Image map area property "${name}" requires an editor.`);
            }
            return true;
        }),
    );
}

export function getAreaData(data, properties) {
    return Object.fromEntries(Object.keys(properties).map((name) => [name, data?.[name] ?? ""]));
}
