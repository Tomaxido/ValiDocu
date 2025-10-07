import React, { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, MenuItem, FormControl, InputLabel, Select,
  Paper, List, ListItem, ListItemText, ListItemButton, Popper, ClickAwayListener
} from "@mui/material";
import { requestGroupAccess, searchUsers } from "../../utils/api";

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
  
  // Estados para autocompletado
  const [suggestions, setSuggestions] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const textFieldRef = useRef<HTMLDivElement>(null);

  // Función para buscar usuarios
  const searchForUsers = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const users = await searchUsers(query);
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Manejar cambios en el input de email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserEmail(value);

    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Establecer nuevo timeout para buscar
    const timeout = setTimeout(() => {
      searchForUsers(value);
    }, 300); // 300ms de debounce

    setSearchTimeout(timeout);
  };

  // Seleccionar usuario de las sugerencias
  const handleSelectUser = (user: { id: string; email: string; name?: string }) => {
    setUserEmail(user.email);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
      setSuggestions([]);
      setShowSuggestions(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
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
          
          <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
            <Box sx={{ position: 'relative' }}>
              <TextField
                ref={textFieldRef}
                label="Email del usuario"
                type="email"
                fullWidth
                value={userEmail}
                onChange={handleEmailChange}
                placeholder="usuario@ejemplo.com"
                disabled={isSubmitting}
                autoComplete="off"
              />
              
              <Popper
                open={showSuggestions}
                anchorEl={textFieldRef.current}
                placement="bottom-start"
                style={{ zIndex: 1300, width: textFieldRef.current?.clientWidth || 'auto' }}
              >
                <Paper elevation={4} sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <List dense>
                    {suggestions.map((user) => (
                      <ListItemButton
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                      >
                        <ListItemText
                          primary={user.email}
                          secondary={user.name || ''}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              </Popper>
            </Box>
          </ClickAwayListener>

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