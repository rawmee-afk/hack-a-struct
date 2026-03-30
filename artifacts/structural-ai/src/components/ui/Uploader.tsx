import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileImage, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function Uploader({ onFileSelect, isLoading }: UploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreview(null);
    // Note: We don't have a way to 'unselect' in the parent currently without changing the prop signature, 
    // but the parent can handle it if we passed null. For simplicity we just reset local state.
  };

  if (preview && selectedFile) {
    return (
      <div className="relative rounded-xl border border-border overflow-hidden bg-card/50 p-2 group h-[300px] flex items-center justify-center">
        {isLoading ? (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="font-mono text-sm text-primary tracking-widest animate-pulse">PROCESSING_VISION_DATA...</p>
          </div>
        ) : (
          <button 
            onClick={clearFile}
            className="absolute top-4 right-4 z-10 p-2 bg-destructive/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg opacity-80" />
        <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur p-3 rounded-lg border border-border flex items-center gap-3 shadow-lg">
          <FileImage className="w-6 h-6 text-primary" />
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 h-[300px] flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30",
        "glass-panel"
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
        isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-secondary text-primary"
      )}>
        <UploadCloud className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-display font-semibold mb-2">
        {isDragActive ? "Drop blueprint matrix here" : "Upload Floor Plan"}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs font-mono">
        Drag & drop PNG, JPG, or PDF file here, or click to browse standard filesystem
      </p>
    </div>
  );
}
