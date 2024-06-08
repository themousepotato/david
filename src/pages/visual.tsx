import { ParentProps } from "solid-js";

const VisualComponent = (props: ParentProps) => {
  return (
    <div>
      {props.children}
    </div>
  );
}

export default VisualComponent;
