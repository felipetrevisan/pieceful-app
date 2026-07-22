import { registerWebModule, NativeModule } from "expo";

// PiecefulGameServicesModule is not available on the web platform.
class PiecefulGameServicesModule extends NativeModule<{}> {}

export default registerWebModule(PiecefulGameServicesModule, "PiecefulGameServices");
