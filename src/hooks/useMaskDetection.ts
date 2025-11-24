import { useState, useEffect, useRef, useCallback } from 'react';
import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { usePerformanceMonitor } from './usePerformanceMonitor';

interface MaskDetectionResult {
  hasFace: boolean;
  wearingMask: boolean;
  confidence: number;
  faceCount: number;
}

interface UseMaskDetectionOptions {
  enabled: boolean;
  onMaskStatusChange?: (wearingMask: boolean) => void;
  intervalMs?: number; // Detection interval in milliseconds
}

export const useMaskDetection = ({ 
  enabled, 
  onMaskStatusChange,
  intervalMs = 2000 // Check every 2 seconds
}: UseMaskDetectionOptions) => {
  const [result, setResult] = useState<MaskDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastMaskStatusRef = useRef<boolean | null>(null);
  
  const { measureOperation, trackMetric } = usePerformanceMonitor();

  // Initialize TensorFlow and load model
  const initializeModel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Set backend to WebGL for better performance
      await tf.setBackend('webgl');
      await tf.ready();

      // Load BlazeFace model for face detection
      const model = await measureOperation(
        'mask_detection',
        'load_blazeface_model',
        async () => {
          return await blazeface.load();
        }
      );

      modelRef.current = model;
      console.log('BlazeFace model loaded successfully');
    } catch (err: any) {
      console.error('Error loading model:', err);
      setError(`ไม่สามารถโหลด AI model ได้: ${err.message}`);
      
      await trackMetric({
        metricType: 'mask_detection',
        operation: 'load_model',
        success: false,
        errorMessage: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [measureOperation, trackMetric]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);

      // Create video element if not exists
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
      }

      videoRef.current.srcObject = mediaStream;

      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            resolve();
          };
        }
      });

      console.log('Camera started successfully');
      return true;
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setError(`ไม่สามารถเข้าถึงกล้องได้: ${err.message}`);
      
      await trackMetric({
        metricType: 'mask_detection',
        operation: 'start_camera',
        success: false,
        errorMessage: err.message
      });
      
      return false;
    }
  }, [trackMetric]);

  // Detect face and estimate mask wearing
  const detectFaceAndMask = useCallback(async () => {
    if (!modelRef.current || !videoRef.current) return;

    try {
      const predictions = await measureOperation(
        'mask_detection',
        'detect_face',
        async () => {
          return await modelRef.current!.estimateFaces(videoRef.current!, false);
        }
      );

      const hasFace = predictions.length > 0;
      let wearingMask = false;
      let confidence = 0;

      if (hasFace) {
        // Heuristic: Check if lower face area is covered
        // In a real implementation, you'd use a custom trained model
        // For now, we estimate based on face landmarks
        const face = predictions[0];
        const landmarks = face.landmarks as number[][];
        
        // Get mouth and nose positions
        const nose = landmarks[2]; // Nose tip
        const mouth = landmarks[3]; // Mouth center
        
        // Calculate visibility of lower face
        // If mouth area has low visibility score, likely wearing mask
        // This is a simplified heuristic - a real model would be more accurate
        const mouthScore = face.probability ? face.probability[0] : 0;
        wearingMask = mouthScore < 0.7; // Lower confidence = likely masked
        confidence = wearingMask ? (1 - mouthScore) : mouthScore;
      }

      const newResult: MaskDetectionResult = {
        hasFace,
        wearingMask,
        confidence,
        faceCount: predictions.length
      };

      setResult(newResult);

      // Trigger callback if mask status changed
      if (lastMaskStatusRef.current !== null && 
          lastMaskStatusRef.current !== wearingMask && 
          onMaskStatusChange) {
        onMaskStatusChange(wearingMask);
      }
      lastMaskStatusRef.current = wearingMask;

      // Track detection metrics
      await trackMetric({
        metricType: 'mask_detection',
        operation: 'detect_mask',
        success: true,
        metadata: {
          hasFace,
          wearingMask,
          confidence,
          faceCount: predictions.length
        }
      });

    } catch (err: any) {
      console.error('Error during detection:', err);
      await trackMetric({
        metricType: 'mask_detection',
        operation: 'detect_mask',
        success: false,
        errorMessage: err.message
      });
    }
  }, [measureOperation, trackMetric, onMaskStatusChange]);

  // Start continuous detection
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = window.setInterval(() => {
      detectFaceAndMask();
    }, intervalMs);
  }, [detectFaceAndMask, intervalMs]);

  // Stop detection
  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Initialize when enabled
  useEffect(() => {
    if (enabled && !modelRef.current) {
      initializeModel();
    }
  }, [enabled, initializeModel]);

  // Start/stop camera and detection based on enabled state
  useEffect(() => {
    const setup = async () => {
      if (enabled && modelRef.current) {
        const cameraStarted = await startCamera();
        if (cameraStarted) {
          startDetection();
        }
      } else {
        stopDetection();
        stopCamera();
      }
    };

    setup();

    return () => {
      stopDetection();
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera, startDetection, stopDetection]);

  // Manual single detection
  const detectOnce = useCallback(async () => {
    if (!enabled) return null;
    if (!modelRef.current) {
      await initializeModel();
    }
    if (!stream) {
      await startCamera();
    }
    await detectFaceAndMask();
    return result;
  }, [enabled, stream, result, initializeModel, startCamera, detectFaceAndMask]);

  return {
    result,
    isLoading,
    error,
    isActive: enabled && !!stream,
    videoElement: videoRef.current,
    detectOnce,
    startCamera,
    stopCamera
  };
};
