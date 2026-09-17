import { BookOpen, Home, MapPin, Scissors } from "lucide-react";
import type { ReactNode } from "react";

export default function BlogLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <main className="blog-site">
      <header className="blog-header">
        <a className="blog-brand" href="/">
          <strong>Replica</strong>
          <span>Home Saloon Service</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/">
            <Home size={17} />
            Home
          </a>
          <a href="/services">
            <Scissors size={17} />
            Services
          </a>
          <a aria-current="page" href="/blog">
            <BookOpen size={17} />
            Blog
          </a>
          <a href="/contact">
            <MapPin size={17} />
            Contact
          </a>
        </nav>
        <a className="blog-book-button" href="/services">
          Book a service
        </a>
      </header>
      {children}
      <footer className="blog-footer">
        <div>
          <strong>Replica Home Saloon Service</strong>
          <p>Professional salon care at home in Lucknow.</p>
        </div>
        <nav>
          <a href="/services">Services</a>
          <a href="/contact">Contact</a>
          <a href="/privacy-policy">Privacy</a>
        </nav>
      </footer>
    </main>
  );
}
