export default function createAreas(map: HTMLMapElement, imageWidth: number, imageHeight: number, areas: Array<{ coords: number[]; shape: string; [key: string]: any }>) {
    if (!map || !imageWidth || !imageHeight) {
        return;
    }
    map.innerHTML = '';
    let newHtml = '';
    areas.forEach(({ coords, shape, ...rest }) => {
        // The coords are saved as percentages, so we need to convert them to actual pixel values
        const pixelCoords = coords.map((coord, index) =>
            Math.round(coord * (index % 2 === 0 ? imageWidth / 100 : imageHeight / 100)),
        );
        newHtml += `<area shape="${shape}" coords="${pixelCoords.join(',')}"`;
        Object.entries(rest).forEach(([key, value]) => {
            if (!value) {
                return;
            }
            newHtml += ` ${key}="${value}"`;
        });
        newHtml += '>';
    });
    map.innerHTML = newHtml;
}
