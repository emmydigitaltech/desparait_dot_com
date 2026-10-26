import Link from "next/link";
import CurrentYear from "./CurrentYear";

export default function Footer() {
  return (
    <footer className="dp-footer">
      <div className="dp-fc">
        <div>
          <h4>Despariat</h4>
          <span style={{ opacity: 0.75 }}>The student marketplace.</span>
        </div>
        <div>
          <h4>Get started</h4>
          <Link href="/dashboard">Create account</Link>
          <Link href="/dashboard">Sign in</Link>
          <Link href="/verify">Become a seller</Link>
        </div>
        <div>
          <h4>Help</h4>
          <a href="#">How it works</a>
          <a href="#">Safety tips</a>
          <a href="mailto:YOUR_SUPPORT_EMAIL">Contact us</a>
        </div>
        <div>
          <h4>Legal</h4>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>

      <div className="dp-copy">
        © <CurrentYear /> Despariat. Meet in public places and inspect items before paying.
      </div>
    </footer>
  );
}
