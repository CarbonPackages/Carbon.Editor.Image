import { neos } from "@neos-project/neos-ui-decorators";
import { connect } from "react-redux";
import { selectors } from "@neos-project/neos-ui-redux-store";
import backend from "@neos-project/neos-ui-backend-connector";

// export const getDataLoaderOptionsForProps = ({ focusedNodePath, options }) => ({
//     contextNodePath: focusedNodePath,
//     dataSourceIdentifier: options.dataSourceIdentifier,
//     dataSourceUri: options.dataSourceUri,
//     dataSourceAdditionalData: options.dataSourceAdditionalData,
//     dataSourceDisableCaching: Boolean(options.dataSourceDisableCaching),
// });

export function injectNeosProps(component, configKey) {
    const neosifier = neos((globalRegistry) => {
        const options = {
            i18nRegistry: globalRegistry.get("i18n"),
            editorsRegistry: globalRegistry.get("inspector").get("editors"),
        };
        if (configKey) {
            options.config = globalRegistry.get("frontendConfiguration").get(`Carbon.Editor.Image.${configKey}`);
        }
        return options;
    });
    const connector = connect((state) => ({
        getNodeByContextPath: selectors.CR.Nodes.nodeByContextPath(state),
        focusedNodePath: selectors.CR.Nodes.focusedNodePathSelector(state),
    }));
    return neosifier(connector(component));
}
