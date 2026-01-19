package br.com.agendainteligente.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

@Service
@Slf4j
public class ImageCompressionService {

    private static final int MAX_WIDTH = 200;
    private static final int MAX_HEIGHT = 200;
    private static final float QUALITY = 0.7f; // 70% de qualidade para reduzir tamanho

    /**
     * Comprime e redimensiona uma imagem em base64
     * @param base64Image String base64 da imagem (com ou sem prefixo data:image/...)
     * @return String base64 da imagem comprimida
     */
    public String compressImage(String base64Image) {
        if (base64Image == null || base64Image.trim().isEmpty()) {
            return null;
        }

        try {
            // Remove o prefixo data:image/... se existir
            String base64Data = base64Image;
            if (base64Image.contains(",")) {
                base64Data = base64Image.substring(base64Image.indexOf(",") + 1);
            }

            // Decodifica base64 para bytes
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);

            // Converte bytes para BufferedImage
            BufferedImage originalImage = ImageIO.read(new java.io.ByteArrayInputStream(imageBytes));
            if (originalImage == null) {
                log.warn("Não foi possível ler a imagem");
                return base64Image; // Retorna original se não conseguir processar
            }

            // Calcula novas dimensões mantendo proporção
            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            
            int newWidth = originalWidth;
            int newHeight = originalHeight;
            
            if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
                double widthRatio = (double) MAX_WIDTH / originalWidth;
                double heightRatio = (double) MAX_HEIGHT / originalHeight;
                double ratio = Math.min(widthRatio, heightRatio);
                
                newWidth = (int) (originalWidth * ratio);
                newHeight = (int) (originalHeight * ratio);
            }

            // Redimensiona a imagem
            BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = resizedImage.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
            g.dispose();

            // Converte para JPEG com compressão
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(resizedImage, "jpg", baos);
            byte[] compressedBytes = baos.toByteArray();

            // Converte de volta para base64
            String compressedBase64 = Base64.getEncoder().encodeToString(compressedBytes);
            
            log.debug("Imagem comprimida: {}x{} -> {}x{}, tamanho: {} -> {} bytes", 
                    originalWidth, originalHeight, newWidth, newHeight, 
                    imageBytes.length, compressedBytes.length);

            return "data:image/jpeg;base64," + compressedBase64;
        } catch (IOException e) {
            log.error("Erro ao comprimir imagem: {}", e.getMessage(), e);
            return base64Image; // Retorna original em caso de erro
        }
    }
}
