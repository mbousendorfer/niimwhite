import "$/styles/style.css";
import "$/styles/style.scss";
import "toastify-js/src/toastify.css";
import App from "$/App.svelte";
import { mount } from "svelte";
import { configureFabric } from "$/defaults";
import { setupDropdownController } from "$/utils/dropdown_controller";

configureFabric();
setupDropdownController();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
