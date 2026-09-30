# Generate assets/landscape-contours.svg: topographic contour lines of the
# objective surface animated on the homepage hero (assets/optimizer-landscape.js).
# Used site-wide as a CSS mask behind page titles.
#
# Keep f() in sync with f() in assets/optimizer-landscape.js.
#
# Usage: Rscript tools/make_contours.R

g <- function(x, y, cx, cy, s) exp(-((x - cx)^2 + (y - cy)^2) / s)
f <- function(x, y) {
  0.62 -
    0.52 * g(x, y, 0.32, -0.22, 0.30) -
    0.20 * g(x, y, -0.48, 0.42, 0.05) +
    0.22 * g(x, y, -0.20, -0.45, 0.06) +
    0.16 * (1 - exp(-(x^2 + y^2) / 2)) +
    0.025 * sin(4 * x + 1) * cos(3 * y)
}

n    <- 90
size <- 520
xs   <- seq(-1, 1, length.out = n)
z    <- outer(xs, xs, f)
lv   <- seq(min(z), max(z), length.out = 18)[-c(1, 18)]
cl   <- contourLines(xs, xs, z, levels = lv)

to_px <- function(v) round((v + 1) / 2 * size)
paths <- vapply(cl, function(k) {
  px <- to_px(k$x)
  py <- to_px(-k$y)
  keep <- c(TRUE, abs(diff(px)) + abs(diff(py)) > 4)  # thin near-duplicate points
  px <- px[keep]; py <- py[keep]
  paste0("M", px[1], " ", py[1], "L", paste(px[-1], py[-1], collapse = " "))
}, character(1))

svg <- sprintf(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d"><path fill="none" stroke="#000" stroke-width="1" d="%s"/></svg>\n',
  size, size, paste(paths, collapse = "")
)
writeLines(svg, "assets/landscape-contours.svg", sep = "")
cat("wrote assets/landscape-contours.svg (", nchar(svg), " bytes, ", length(cl), " lines)\n", sep = "")
