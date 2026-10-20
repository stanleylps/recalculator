# Serves the calculators at /recalculator/ (as on the live site) with PHP for the email sign-up.
# api/config.php holds the Sender token: it is mounted at run time, never copied into the image.
FROM php:8.4-apache
RUN a2enmod rewrite headers \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
RUN printf 'RewriteEngine On\nRewriteRule ^$ /recalculator/ [R=302,L]\n' > /var/www/html/.htaccess
COPY . /var/www/html/recalculator/
RUN chown www-data /var/www/html/recalculator/api
