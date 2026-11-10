import { createRoot, type Root } from "react-dom/client";
import { UniversalApp, type UniversalAppProps } from "./UniversalApp";

export type UniversalAppMount = {
  root: Root;
  unmount: () => void;
};

export function mountUniversalApp(
  element: Element,
  props: UniversalAppProps = {},
): UniversalAppMount {
  const root = createRoot(element);
  root.render(<UniversalApp {...props} />);
  return {
    root,
    unmount: () => root.unmount(),
  };
}
