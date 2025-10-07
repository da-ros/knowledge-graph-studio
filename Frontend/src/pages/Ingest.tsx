import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info, X, Library, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiClient, TextInput } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const PRESETS = [
  { value: "custom", label: "Custom" },
  { value: "apple", label: "Apple Inc. Example" },
  { value: "startup", label: "TechCorp Startup Example" },
  { value: "personal", label: "Personal Story Example" },
  { value: "python", label: "Python History Example" },
];

const PRESET_TEXTS: Record<string, string> = {
  custom: "",
  apple: `Apple Inc. was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne in Cupertino, California.
The company is known for creating the iPhone, iPad, and Mac computers.
Tim Cook became CEO in 2011 after Steve Jobs passed away.
Apple has retail stores worldwide and is headquartered in Apple Park, a massive campus in Cupertino.
The company's main competitors include Microsoft, Google, and Samsung.`,
  startup: `Our startup TechCorp was founded in 2020 by John Smith and Jane Doe. 
We raised $2M in Series A funding from Venture Capital Partners.
Our main product is an AI platform that helps businesses automate customer service.
We hired 50 employees and expanded to Europe in 2022.`,
  personal: `I was born in New York City in 1990. My family moved to California when I was 10. 
I attended Stanford University and studied Computer Science. 
I met Sarah at Tech Conference 2015. Sarah and I met at Tech Conference 2015.
We got married in 2018 and now live in San Francisco. 
I work at Google as a software engineer and have two children, Emma and Jake.
Sarah works as a software engineer at Google. Emma and Jake are our children.`,
  python: `Python was invented in the late 1980s by Guido van Rossum at Centrum Wiskunde & Informatica in the Netherlands as a successor to the ABC 
programming language, which was inspired by SETL capable of exception handling and interfacing with the Amoeba operating system. 
Its implementation began in December 1989. Python 2.0 was released on 16 October 2000, with many major new features such as list comprehensions, 
cycle-detecting garbage collection, reference counting, and Unicode support. Python 3.0, released on 3 December 2008, 
with many of its major features backported to Python 2.6.x and 2.7.x. Releases of Python 3 include the 2to3 utility, 
which automates the translation of Python 2 code to Python 3.`,
};

const MAX_CHARS = 5000;

const Ingest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [preset, setPreset] = useState("custom");
  const [enhanceText, setEnhanceText] = useState(true);

  const handlePresetChange = (value: string) => {
    setPreset(value);
    setText(PRESET_TEXTS[value] || "");
  };
  const [showTip, setShowTip] = useState(true);

  // API mutation for processing text
  const processMutation = useMutation({
    mutationFn: async (inputData: TextInput) => {
      try {
        const response = await apiClient.processText(inputData);
        return response;
      } catch (error) {
        console.error('Process text error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Process text success:', data);
      toast({
        title: "Graph created successfully",
        description: `Created graph with ${data.metadata.nodes} nodes and ${data.metadata.edges} edges.`,
      });
      navigate(`/graphs/${data.metadata.id}`);
    },
    onError: (error) => {
      console.error('Process text mutation error:', error);
      
      let errorMessage = 'Unknown error';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out after 3 minutes. The text processing is taking longer than expected. Please try again.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network connection was lost during processing. The graph may have been created successfully - please check the Graphs page.';
      } else if (error.message.includes('API Error')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message || 'Unknown error';
      }
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleExtractAndSave = () => {
    if (!text.trim()) return;
    processMutation.mutate({ text, enhance: enhanceText });
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText.slice(0, MAX_CHARS));
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      {/* App Bar */}
      <header className="flex items-center justify-between mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Text2Graph</h1>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full glass-card-subtle"
          onClick={() => navigate("/graphs")}
        >
          <Library className="h-5 w-5" />
        </Button>
      </header>

      {/* Tip Banner */}
      {showTip && (
        <Card className="glass-card p-4 mb-4 flex items-start gap-3 animate-slide-up">
          <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground flex-1">
            Paste text about entities & relations to build your knowledge graph
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-2"
            onClick={() => setShowTip(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {/* Textarea Card */}
      <Card className="glass-card p-4 mb-4 animate-scale-in">
        <div className="mb-3 flex items-center justify-between">
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="glass-card-subtle border-none w-48">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent className="glass-card">
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="enhance-text"
              checked={enhanceText}
              onCheckedChange={setEnhanceText}
            />
            <Label htmlFor="enhance-text" className="text-sm font-medium">
              Enhance text
            </Label>
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Paste or type text here..."
          className="min-h-[200px] resize-none border-none bg-transparent text-base focus-visible:ring-0"
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            chars: {text.length}/{MAX_CHARS}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePaste}
              className="glass-card-subtle"
            >
              Paste
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setText("")}
              className="glass-card-subtle"
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>


      {/* Actions */}
      <div className="fixed bottom-6 left-4 right-4 animate-fade-in">
        <Button
          size="lg"
          onClick={handleExtractAndSave}
          disabled={!text || processMutation.isPending}
          className="w-full bg-gradient-to-r from-accent to-primary text-white shadow-xl hover:shadow-2xl disabled:opacity-50 text-base font-semibold"
        >
          {processMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...(This may take up to 3 minutes)
            </>
          ) : (
            "Extract & Save"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Ingest;
