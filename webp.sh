for file in /home/runner/work/blog.saintmalik.me/blog.saintmalik.me/$1/*; do cwebp -q 80 "$file" -o "${file%.*}.webp"; done