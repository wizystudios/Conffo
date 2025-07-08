import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  User, 
  CreditCard,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export function RealImageVerification() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verificationData, setVerificationData] = useState<any>({});
  
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const livenessVideoRef = useRef<HTMLVideoElement>(null);

  const verificationSteps: VerificationStep[] = [
    {
      id: 'selfie',
      title: 'Profile Photo Verification',
      description: 'Take a clear selfie matching your profile photo',
      icon: <User className="h-5 w-5" />,
      required: true,
      status: 'pending'
    },
    {
      id: 'liveness',
      title: 'Liveness Check',
      description: 'Record a short video following our instructions',
      icon: <Eye className="h-5 w-5" />,
      required: true,
      status: 'pending'
    },
    {
      id: 'id_document',
      title: 'ID Document',
      description: 'Upload a government-issued ID (optional but recommended)',
      icon: <CreditCard className="h-5 w-5" />,
      required: false,
      status: 'pending'
    }
  ];

  const [steps, setSteps] = useState(verificationSteps);

  const updateStepStatus = (stepId: string, status: VerificationStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const uploadImage = async (file: File, verificationType: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `verification/${user?.id}/${verificationType}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const analyzeImage = async (imageUrl: string, verificationType: string) => {
    // Simulate image analysis (in real app, this would call external AI service)
    return new Promise((resolve) => {
      setTimeout(() => {
        const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
        resolve({
          confidence,
          analysis: {
            face_detected: confidence > 0.8,
            real_person: confidence > 0.75,
            matches_profile: confidence > 0.8,
            quality_score: confidence
          }
        });
      }, 2000);
    });
  };

  const handleSelfieUpload = async (file: File) => {
    updateStepStatus('selfie', 'in_progress');
    setIsProcessing(true);
    
    try {
      setUploadProgress(20);
      const imageUrl = await uploadImage(file, 'selfie');
      
      setUploadProgress(50);
      const analysis = await analyzeImage(imageUrl, 'face_match');
      
      setUploadProgress(80);
      
      // Save verification request
      const { error } = await supabase
        .from('image_verification')
        .insert({
          user_id: user?.id || '',
          image_url: imageUrl,
          verification_type: 'face_match',
          verification_data: analysis as any,
          status: 'pending'
        });

      if (error) throw error;

      setUploadProgress(100);
      updateStepStatus('selfie', 'completed');
      
      setVerificationData(prev => ({ ...prev, selfie: { imageUrl, analysis } }));
      
      toast({
        description: "Selfie uploaded and analyzed successfully!"
      });
      
      if (currentStep === 0) setCurrentStep(1);
    } catch (error) {
      console.error('Error processing selfie:', error);
      updateStepStatus('selfie', 'failed');
      toast({
        variant: "destructive",
        description: "Failed to process selfie. Please try again."
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const startLivenessCheck = async () => {
    updateStepStatus('liveness', 'in_progress');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: false 
      });
      
      if (livenessVideoRef.current) {
        livenessVideoRef.current.srcObject = stream;
        livenessVideoRef.current.play();
      }

      // Simulate liveness detection instructions
      toast({
        description: "Look at the camera and slowly turn your head left, then right, then smile."
      });

      // Auto-complete after 10 seconds (in real app, this would be actual liveness detection)
      setTimeout(() => {
        updateStepStatus('liveness', 'completed');
        stream.getTracks().forEach(track => track.stop());
        
        if (livenessVideoRef.current) {
          livenessVideoRef.current.srcObject = null;
        }
        
        toast({
          description: "Liveness check completed successfully!"
        });
        
        if (currentStep === 1) setCurrentStep(2);
      }, 10000);
      
    } catch (error) {
      console.error('Error starting liveness check:', error);
      updateStepStatus('liveness', 'failed');
      toast({
        variant: "destructive",
        description: "Failed to start liveness check. Please check camera permissions."
      });
    }
  };

  const handleIdUpload = async (file: File) => {
    updateStepStatus('id_document', 'in_progress');
    setIsProcessing(true);
    
    try {
      const imageUrl = await uploadImage(file, 'id_document');
      const analysis = await analyzeImage(imageUrl, 'id_document');
      
      // Save verification request
      const { error } = await supabase
        .from('image_verification')
        .insert({
          user_id: user?.id || '',
          image_url: imageUrl,
          verification_type: 'id_document',
          verification_data: analysis as any,
          status: 'pending'
        });

      if (error) throw error;

      updateStepStatus('id_document', 'completed');
      
      toast({
        description: "ID document uploaded successfully!"
      });
    } catch (error) {
      console.error('Error processing ID:', error);
      updateStepStatus('id_document', 'failed');
      toast({
        variant: "destructive",
        description: "Failed to process ID document. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (step: VerificationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return step.icon;
    }
  };

  const getStepBadge = (step: VerificationStep) => {
    const variant = step.status === 'completed' ? 'default' : 
                   step.status === 'failed' ? 'destructive' : 
                   step.status === 'in_progress' ? 'secondary' : 'outline';
    
    return (
      <Badge variant={variant}>
        {step.status === 'completed' ? 'Completed' :
         step.status === 'failed' ? 'Failed' :
         step.status === 'in_progress' ? 'Processing' : 'Pending'}
      </Badge>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Real Image Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This verification process helps ensure authentic users and reduces fake profiles. 
              Your verification data is securely stored and only used for identity confirmation.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step)}
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!step.required && <Badge variant="outline">Optional</Badge>}
                    {getStepBadge(step)}
                  </div>
                </div>

                {/* Selfie Upload */}
                {step.id === 'selfie' && step.status === 'pending' && (
                  <div>
                    <input
                      ref={selfieInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelfieUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button
                      onClick={() => selfieInputRef.current?.click()}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Selfie
                    </Button>
                  </div>
                )}

                {/* Liveness Check */}
                {step.id === 'liveness' && step.status === 'pending' && currentStep >= 1 && (
                  <div className="space-y-3">
                    {steps.find(s => s.id === 'liveness')?.status === 'in_progress' && (
                      <video
                        ref={livenessVideoRef}
                        className="w-full h-48 bg-black rounded-lg"
                      />
                    )}
                    <Button
                      onClick={startLivenessCheck}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Start Liveness Check
                    </Button>
                  </div>
                )}

                {/* ID Document Upload */}
                {step.id === 'id_document' && currentStep >= 2 && (
                  <div>
                    <input
                      ref={idInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleIdUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button
                      onClick={() => idInputRef.current?.click()}
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload ID Document
                    </Button>
                  </div>
                )}

                {/* Processing Progress */}
                {step.status === 'in_progress' && uploadProgress > 0 && (
                  <div className="mt-3">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-center mt-1">Processing... {uploadProgress}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completion Status */}
          {steps.filter(s => s.required).every(s => s.status === 'completed') && (
            <Alert className="mt-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Verification complete! Your account will be reviewed and verified within 24-48 hours.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}