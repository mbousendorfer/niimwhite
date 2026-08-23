const triggerSelector = "[data-dropdown-toggle]";

const menuForTrigger = (trigger: Element): HTMLElement | null => {
  const sibling = trigger.nextElementSibling;
  if (sibling instanceof HTMLElement && sibling.classList.contains("dropdown-menu")) return sibling;
  return trigger.parentElement?.querySelector(":scope > .dropdown-menu") ?? null;
};

export const closeDropdowns = (except?: HTMLElement) => {
  document.querySelectorAll<HTMLElement>(".dropdown-menu.show").forEach((menu) => {
    if (except && (menu === except || menu.contains(except))) return;
    menu.classList.remove("show");
    menu.parentElement?.querySelector<HTMLElement>(`:scope > ${triggerSelector}`)?.setAttribute("aria-expanded", "false");
  });
};

export const closeDropdown = (element: Element) => {
  const menu = element.classList.contains("dropdown-menu")
    ? element
    : element.closest(".dropdown")?.querySelector(":scope > .dropdown-menu");
  if (!(menu instanceof HTMLElement)) return;
  menu.classList.remove("show");
  menu.parentElement?.querySelector<HTMLElement>(`:scope > ${triggerSelector}`)?.setAttribute("aria-expanded", "false");
};

export const setupDropdownController = () => {
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest(triggerSelector);

    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      const menu = menuForTrigger(trigger);
      if (!menu) return;
      const opening = !menu.classList.contains("show");
      closeDropdowns(menu);
      menu.classList.toggle("show", opening);
      trigger.setAttribute("aria-expanded", String(opening));
      return;
    }

    const openMenu = target?.closest(".dropdown-menu.show");
    const rootTrigger = openMenu?.parentElement?.querySelector<HTMLElement>(`:scope > ${triggerSelector}`);
    if (openMenu && rootTrigger?.dataset.dropdownAutoClose === "outside") return;
    closeDropdowns();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const activeTrigger = document.querySelector<HTMLElement>(`${triggerSelector}[aria-expanded='true']`);
    closeDropdowns();
    activeTrigger?.focus();
  };

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeyDown);
  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
  };
};
