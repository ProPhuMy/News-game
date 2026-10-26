// When the button a player just pressed unmounts, move focus to the new content instead of dropping it to <body>.
export const keepFocus = (el: HTMLElement | null) => {
  if (el && (document.activeElement === null || document.activeElement === document.body)) el.focus();
};
