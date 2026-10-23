import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy – Despariat" };

export default function Privacy() {
  return (
    <article className="dp-legal">
      <h1>Privacy Policy</h1>
      <p className="dp-meta">Effective date: 23 October 2026</p>

      <p>
        This policy explains what personal data Despariat (“we”, “us”) collects, why, and the choices you have. We are
        the data controller: DESPARAIT, Nigeria. Contact: support@desparait.com. We handle personal
        data in line with the Nigeria Data Protection Act 2023.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><b>From Google sign-in:</b> your name, email address and profile picture.</li>
        <li><b>Profile details you add:</b> for example your campus or hostel area and phone number, if you provide them.</li>
        <li><b>Listings and messages:</b> titles, descriptions, prices, photos, and meet-up requests you send or receive.</li>
        <li><b>Seller verification:</b> if you apply to be a verified seller, the information and documents you submit
          for that review.</li>
        <li><b>Technical data:</b> device and browser type, IP address, and a session cookie that keeps you signed in.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To create your account and sign you in.</li>
        <li>To show your listings and let buyers and sellers arrange meet-ups.</li>
        <li>To review verification requests and keep the marketplace safe, including preventing fraud and abuse.</li>
        <li>To respond to support requests and improve the Service.</li>
      </ul>
      <p>We do not sell your personal data and we do not use it for advertising.</p>

      <h2>3. Google user data</h2>
      <p>
        We use your Google account information only to sign you in and create your Despariat profile. We do not use
        Google user data for advertising, and we do not transfer it to others except as needed to run the Service
        (for example, our hosting and database provider) or as required by law. Our use of information received from
        Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.
      </p>

      <h2>4. Who sees your information</h2>
      <ul>
        <li><b>Other users:</b> your name, profile picture, verified status and listings are visible on the Service.
          Your email address is not shown publicly.</li>
        <li><b>Service providers:</b> we use Supabase to host our database, authentication and file storage, and
          Vercel to host the website. They process data only on our behalf.</li>
        <li><b>Legal reasons:</b> we may disclose information if the law requires it or to protect users’ safety.</li>
      </ul>

      <h2>5. Where your data is stored</h2>
      <p>Our providers may store data on servers outside Nigeria. Where that happens we take steps to keep it
        protected, as required by Nigerian data protection law.</p>

      <h2>6. How long we keep it</h2>
      <p>We keep account and listing data while your account is active. Verification documents are kept only as long
        as needed to complete and record the review, up to 2 weeks. When you delete your
        account we delete or anonymise your data within 30 days, except where we must keep something for
        legal or safety reasons.</p>

      <h2>7. Security</h2>
      <p>We use access controls and encrypted connections to protect your data. No online service is completely
        secure, so please protect your Google account too.</p>

      <h2>8. Your rights</h2>
      <p>
        You can ask us to access, correct or delete your personal data, to restrict or object to certain uses, and
        to withdraw consent where we rely on it. Email support@desparait.com and we will respond within a reasonable
        time. You also have the right to complain to the Nigeria Data Protection Commission.
      </p>

      <h2>9. Children</h2>
      <p>Despariat is for adults aged 18 and over. We do not knowingly collect data from children. If you believe a
        child has given us data, contact us and we will delete it.</p>

      <h2>10. Cookies</h2>
      <p>We use only the cookies needed to sign you in and keep your session secure. We do not use advertising
        cookies.</p>

      <h2>11. Changes</h2>
      <p>If we change this policy we will update the date above and, for significant changes, tell you on the
        Service.</p>

      <p>See also our <Link href="/terms">Terms of Service</Link>.</p>
    </article>
  );
}
