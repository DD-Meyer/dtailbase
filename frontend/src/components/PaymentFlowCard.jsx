import { Check } from "lucide-react";
import styles from "./PaymentFlowCard.module.css";

export default function PaymentFlowCard({ step, complete = false, title, description, children }) {
  return (
    <section className={styles.page} aria-labelledby="payment-title">
      <div className={styles.card}>
        <ol className={styles.steps} aria-label="Subscription progress">
          {["Review & subscribe", "Verify & activate"].map((label, index) => {
            const number = index + 1;
            const done = complete || number < step;
            return <li key={label} data-done={done} aria-current={!complete && number === step ? "step" : undefined}>
              <span className={styles.number}>{done ? <Check size={16} aria-hidden="true" /> : number}</span>
              <span><small>Step {number}{done ? " · Complete" : ""}</small>{label}</span>
            </li>;
          })}
        </ol>
        <header className={styles.head}>
          <h1 id="payment-title">{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}
