import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, MenuItem, FormControl, InputLabel, Select
} from "@mui/material";
import { requestGroupAccess } from "../../utils/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  onRequestSent?: () => void;
}

export default function RequestAccessModal({ isOpen, onClose, groupId, groupName, onRequestSent }: Props) {
  const [userEmail, setUserEmail] = useState("");
  const [permissionType, setPermissionType] = useState<number>(0);
  const [requestReason, setRequestReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userEmail.trim()) {
      alert("Por favor ingresa el email del usuario");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestGroupAccess(groupId, userEmail, permissionType, requestReason);
      
      alert("Solicitud de acceso enviada correctamente");
      
      // Limpiar formulario
      setUserEmail("");
      setPermissionType(0);
      setRequestReason("");
      
      if (onRequestSent) {
        onRequestSent();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error sending access request:', error);
      alert(error.message || "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setUserEmail("");
      setPermissionType(0);
      setRequestReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Solicitar acceso al grupo: {groupName}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Como propietario de este grupo privado, puedes solicitar que un administrador otorgue acceso a otro usuario.
          </Typography>
          
          <TextField
            label="Email del usuario"
            type="email"
            fullWidth
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            disabled={isSubmitting}
          />

          <FormControl fullWidth disabled={isSubmitting}>
            <InputLabel>Tipo de permiso</InputLabel>
            <Select
              value={permissionType}
              onChange={(e) => setPermissionType(e.target.value as number)}
              label="Tipo de permiso"
            >
              <MenuItem value={0}>Solo lectura</MenuItem>
              <MenuItem value={1}>Lectura y edición</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Razón de la solicitud (opcional)"
            multiline
            rows={3}
            fullWidth
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder="Explica por qué este usuario necesita acceso al grupo..."
            disabled={isSubmitting}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isSubmitting || !userEmail.trim()}
        >
          {isSubmitting ? "Enviando..." : "Enviar solicitud"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}