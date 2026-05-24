import React from "react";
import { ToothChart } from "@/components/clinical/ToothChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, ClipboardList, Stethoscope, Image as ImageIcon } from "lucide-react";

export default function Clinical() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif">Clinical Records</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Patient: <span className="font-medium text-foreground">Rahul Sharma</span> (ID: #PT-8829)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <ImageIcon className="h-4 w-4" /> View X-Rays
          </Button>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" /> Save Record
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ToothChart />

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Treatment Notes (SOAP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="subjective" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="subjective">S</TabsTrigger>
                  <TabsTrigger value="objective">O</TabsTrigger>
                  <TabsTrigger value="assessment">A</TabsTrigger>
                  <TabsTrigger value="plan">P</TabsTrigger>
                </TabsList>
                <TabsContent value="subjective" className="mt-4">
                  <Textarea placeholder="Subjective: Patient's complaints, history..." className="min-h-[120px]" />
                </TabsContent>
                <TabsContent value="objective" className="mt-4">
                  <Textarea placeholder="Objective: Vital signs, clinical findings..." className="min-h-[120px]" />
                </TabsContent>
                <TabsContent value="assessment" className="mt-4">
                  <Textarea placeholder="Assessment: Diagnosis, differential diagnosis..." className="min-h-[120px]" />
                </TabsContent>
                <TabsContent value="plan" className="mt-4">
                  <Textarea placeholder="Plan: Recommended procedures, medications..." className="min-h-[120px]" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Recent History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: "Oct 12, 2026", type: "Root Canal", status: "Completed" },
                  { date: "Sep 05, 2026", type: "Check-up", status: "Completed" },
                  { date: "Aug 20, 2026", type: "Scaling", status: "Completed" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col border-b pb-3 last:border-0 last:pb-0">
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                    <span className="text-sm font-medium">{item.type}</span>
                    <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold mt-1">{item.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-base font-sans">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start text-xs h-9">Issue Prescription</Button>
              <Button variant="outline" className="justify-start text-xs h-9">Generate Referral</Button>
              <Button variant="outline" className="justify-start text-xs h-9">Book Follow-up</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
