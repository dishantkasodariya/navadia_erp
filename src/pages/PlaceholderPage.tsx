import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-medium text-muted-foreground">Coming Soon</h2>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
            This module is under development. Check back soon for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
