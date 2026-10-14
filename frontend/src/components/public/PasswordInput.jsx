import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./AuthControls.module.css";

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.password}>
      <input {...props} type={visible ? "text" : "password"} />
      <button type="button" aria-label={`${visible ? "Hide" : "Show"} ${props.id?.includes("confirm") ? "confirmation password" : "password"}`}
        aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}
