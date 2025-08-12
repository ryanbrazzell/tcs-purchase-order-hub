import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Clock, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center space-y-8 animate-in">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              TCS Purchase Order Hub
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Streamline your purchase order creation process with intelligent PDF parsing and automated form generation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="shadow-lg">
                <Link href="/po">
                  <FileText className="mr-2 h-5 w-5" />
                  Create Purchase Order
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Efficient Workflow
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage purchase orders effectively
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Smart PDF Parsing</h3>
              <p className="text-sm text-muted-foreground">
                Automatically extract information from proposal PDFs with advanced AI technology
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">Auto-Save Drafts</h3>
              <p className="text-sm text-muted-foreground">
                Never lose your work with automatic draft saving and recovery
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Fast Processing</h3>
              <p className="text-sm text-muted-foreground">
                Generate professional purchase orders in seconds with one-click export
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm text-muted-foreground">
                Your data is processed securely with enterprise-grade protection
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-12 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to streamline your purchase orders?
            </h2>
            <p className="text-lg text-muted-foreground">
              Start creating professional purchase orders in minutes
            </p>
            <Button asChild size="lg" className="shadow-lg">
              <Link href="/po">
                Get Started Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}