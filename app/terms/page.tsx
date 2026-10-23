import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service – Despariat" };

export default function Terms() {
  return (
    <article className="dp-legal">
      <h1>Terms of Service</h1>
      <p className="dp-meta">Effective date: 23 October 2026</p>

      <p>
        These terms govern your use of Despariat (the “Service”), a campus marketplace where students list, find and
        arrange to buy and sell items and services. The Service is operated by DESPARAIT PLC, Nigeria
        (“we”, “us”). By signing in or using the Service you agree to these terms. If you do not agree, do not use it.
      </p>

      <h2>1. What Despariat is</h2>
      <p>
        Despariat is a platform that connects buyers and sellers. We are not a party to any sale, we do not own or
        inspect the items listed, and we do not process payments. Every transaction is arranged directly between the
        buyer and the seller, and payment is made in person.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You sign in with your Google account. You must be 18 or older, or have permission from a parent or guardian.</li>
        <li>You are responsible for activity on your account. Keep your Google login secure.</li>
        <li>Give accurate information. One person, one account.</li>
      </ul>

      <h2>3. Safe trading rules</h2>
      <ul>
        <li>Meet in a busy public place on campus. Inspect the item before you pay.</li>
        <li>Never send money before you have seen and checked the item.</li>
        <li>Report suspicious users or listings to us at support@desparait.com</li>
      </ul>
      <p>
        You trade at your own risk. We cannot guarantee the quality, safety or legality of any item or the identity or
        conduct of any user.
      </p>

      <h2>4. Listings and seller conduct</h2>
      <p>When you post a listing you confirm that you own the item or have the right to sell it, and that the title,
        description, price and photos are accurate. You must not list:</p>
      <ul>
        <li>Illegal items, drugs, weapons, or stolen or counterfeit goods.</li>
        <li>Leaked or stolen examination papers or answers for exams that have not yet been taken, or services that
          help others cheat in assessments.</li>
        <li>Adult content, hateful or harassing content, or anything that infringes someone else’s rights.</li>
        <li>Anything that asks buyers to pay before they have inspected the item.</li>
      </ul>
      <p>We may remove listings and suspend or close accounts that break these rules, at our discretion.</p>

      <h2>5. Verified sellers</h2>
      <p>
        Sellers may apply for a verified badge by submitting information we ask for. Verification means we reviewed
        what was submitted at that time. It is not a guarantee of the seller’s honesty, and it does not make us
        responsible for their listings or conduct. We can refuse or remove verification at any time.
      </p>

      <h2>6. Your content</h2>
      <p>
        You keep ownership of what you post (listings, photos, messages). You give us a non-exclusive, worldwide,
        royalty-free licence to host, display and distribute it as needed to run and promote the Service. You are
        responsible for your content.
      </p>

      <h2>7. Acceptable use</h2>
      <p>Do not scrape the Service, interfere with its security, create fake accounts, harass others, or use the
        Service for anything unlawful.</p>

      <h2>8. Disclaimers and limits on liability</h2>
      <p>
        The Service is provided “as is” and “as available”. To the extent the law allows, we are not liable for losses
        arising from transactions between users, for items or services bought or sold, for user content, or for
        interruptions to the Service. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2>9. Suspension and ending your account</h2>
      <p>You can stop using the Service at any time and ask us to delete your account at support@desparait.com. We may
        suspend or end access if you break these terms or put others at risk.</p>

      <h2>10. Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version, and continued use after a change
        means you accept it.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria. Disputes are subject to the courts
        of Kaduna State, Nigeria.</p>

      <h2>12. Contact</h2>
      <p>Questions about these terms: support@desparait.com. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </article>
  );
}
