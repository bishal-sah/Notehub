/**
 * Public footer with links and branding.
 */
import { Link } from 'react-router-dom';
import { BookOpen, Facebook, Github, Instagram, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>NoteHub</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            A centralized academic notes-sharing platform for students across all faculties.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/faculties" className="hover:text-foreground transition-colors">Faculties</Link></li>
            <li><Link to="/notes" className="hover:text-foreground transition-colors">Browse Notes</Link></li>
            <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
            <li><Link to="/donate" className="hover:text-foreground transition-colors text-red-500 font-medium">❤️ Donate</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Account</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground transition-colors">Log in</Link></li>
            <li><Link to="/register" className="hover:text-foreground transition-colors">Sign up</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Connect With Us</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="https://www.facebook.com/share/1CB5KWwTfq/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors"><Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook</a></li>
            <li><a href="https://www.instagram.com/notehub248" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors"><Instagram className="h-4 w-4 text-[#E4405F]" /> @notehub248</a></li>
            <li><a href="https://github.com/bishal-sah/Notehub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors"><Github className="h-4 w-4" /> GitHub</a></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@notehub.com</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-red-500" /> Biratnagar, Nepal</li>
            <li><a href="tel:+9779819702145" className="flex items-center gap-2 hover:text-foreground transition-colors"><Phone className="h-4 w-4 shrink-0 text-green-500" /> +977 981-9702145</a></li>
            <li><a href="tel:+9779807000750" className="flex items-center gap-2 hover:text-foreground transition-colors"><Phone className="h-4 w-4 shrink-0 text-green-500" /> +977 980-7000750</a></li>
            <li><a href="tel:+9779762332949" className="flex items-center gap-2 hover:text-foreground transition-colors"><Phone className="h-4 w-4 shrink-0 text-green-500" /> +977 976-2332949</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4">
        <p className="text-center text-sm text-muted-foreground">&copy; {new Date().getFullYear()} NoteHub. All rights reserved.</p>
      </div>
    </footer>
  );
}
