import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause } from "lucide-react";

interface TimelineSliderProps {
  minTime: number; // timestamp em ms
  maxTime: number; // timestamp em ms
  currentTime: number;
  onTimeChange: (timestamp: number) => void;
  interval: '1h' | '3h' | '6h' | '24h';
  onIntervalChange: (interval: '1h' | '3h' | '6h' | '24h') => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

const TimelineSlider = ({
  minTime,
  maxTime,
  currentTime,
  onTimeChange,
  interval,
  onIntervalChange,
  isPlaying,
  onPlayPause,
}: TimelineSliderProps) => {
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSliderChange = (value: number[]) => {
    onTimeChange(value[0]);
  };

  return (
    <div className="tech-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayPause}
            className="gap-2"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pausar" : "Play"}
          </Button>

          <div className="text-sm font-medium">
            {formatDateTime(currentTime)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Acumulação:</span>
          <Select value={interval} onValueChange={onIntervalChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="3h">3h</SelectItem>
              <SelectItem value="6h">6h</SelectItem>
              <SelectItem value="24h">24h</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          min={minTime}
          max={maxTime}
          step={60 * 60 * 1000} // 1 hora em ms
          onValueChange={handleSliderChange}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatDateTime(minTime)}</span>
          <span>{formatDateTime(maxTime)}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Histórico 7 dias • Previsão 72h
      </div>
    </div>
  );
};

export default TimelineSlider;
