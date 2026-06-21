#!/usr/bin/env Rscript

# Build native Quarto reference pages from a package's Rd man pages.
#
# Converts each man/*.Rd in the ferx-r source tree into a .qmd page under
# reference/, plus a grouped index page (reference/index.qmd) that mirrors the
# section structure curated in ferx-r's _pkgdown.yml. The resulting pages are
# rendered by `quarto render` with the site theme (cosmo + _brand.yml), so the
# function reference matches the rest of the site instead of carrying pkgdown's
# separate Bootstrap chrome.
#
# Usage:
#   Rscript tools/build_reference.R <ferx-r-source-dir> [output-dir]
#
# Defaults: output-dir = "reference" (relative to the site root).

suppressPackageStartupMessages({
  library(Rd2md)
})

`%||%` <- function(a, b) if (is.null(a)) b else a

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1L) {
  stop("usage: build_reference.R <ferx-r-source-dir> [output-dir]", call. = FALSE)
}
src_dir <- normalizePath(args[[1]], mustWork = TRUE)
out_dir <- if (length(args) >= 2L) args[[2]] else "reference"
man_dir <- file.path(src_dir, "man")
pkgdown_yml <- file.path(src_dir, "_pkgdown.yml")

dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

rd_files <- list.files(man_dir, pattern = "\\.Rd$", full.names = TRUE)
if (!length(rd_files)) stop("no .Rd files found in ", man_dir, call. = FALSE)

topic_of <- function(path) sub("\\.Rd$", "", basename(path))
topics <- topic_of(rd_files)

# Map every documented topic (including \alias-only names that share an .Rd with
# another function, e.g. print.ferx_job lives in ferx_fit_async.Rd) to the page
# slug it renders to. Used for both cross-ref link rewriting and resolving
# _pkgdown.yml index entries that reference an alias rather than a file stem.
alias_map <- list()
for (rd in rd_files) {
  slug <- topic_of(rd)
  txt <- paste(readLines(rd, warn = FALSE), collapse = "\n")
  aliases <- regmatches(txt, gregexpr("\\\\alias\\{([^}]+)\\}", txt, perl = TRUE))[[1]]
  aliases <- sub("\\\\alias\\{([^}]+)\\}", "\\1", aliases, perl = TRUE)
  for (a in unique(c(slug, aliases))) alias_map[[a]] <- slug
}

# Remove \dontrun{...} / \donttest{...} wrappers while keeping the inner code.
# Rd2md 1.0.1 has no method for these tags and drops the block entirely. We
# strip the wrapper and its *matching* closing brace (balanced scan) so no
# stray "{"/"}" leaks into the rendered example code.
unwrap_norun <- function(txt) {
  s <- paste(txt, collapse = "\n")
  for (tag in c("\\dontrun{", "\\donttest{")) {
    repeat {
      start <- regexpr(tag, s, fixed = TRUE)
      if (start < 0) break
      open <- start + nchar(tag) - 1L          # index of the tag's "{"
      chars <- strsplit(s, "", fixed = TRUE)[[1]]
      depth <- 0L
      close <- NA_integer_
      for (i in seq(open, length(chars))) {
        if (chars[i] == "{") depth <- depth + 1L
        else if (chars[i] == "}") {
          depth <- depth - 1L
          if (depth == 0L) { close <- i; break }
        }
      }
      if (is.na(close)) break  # unbalanced; leave as-is to avoid corruption
      inner <- substr(s, open + 1L, close - 1L)
      s <- paste0(substr(s, 1L, start - 1L), inner,
                  substr(s, close + 1L, nchar(s)))
    }
  }
  strsplit(s, "\n", fixed = TRUE)[[1]]
}

# Rewrite intra-package cross references emitted by Rd2md as bare topic names:
#   [ferx_model](ferx_model) -> [ferx_model](ferx_model.qmd)
# Only rewrite targets that resolve to a real topic page; leave external and
# anchor links untouched. (base gsub has no function-replacement, so do an
# explicit gregexpr pass.)
rewrite_links <- function(md_text, alias_map) {
  pattern <- "\\]\\(([A-Za-z0-9._]+)\\)"
  m <- gregexpr(pattern, md_text, perl = TRUE)
  regmatches(md_text, m) <- lapply(regmatches(md_text, m), function(hits) {
    vapply(hits, function(h) {
      target <- sub(pattern, "\\1", h, perl = TRUE)
      slug <- alias_map[[target]]
      if (!is.null(slug)) sprintf("](%s.qmd)", slug) else h
    }, character(1))
  })
  md_text
}

convert_one <- function(rd_path, alias_map) {
  topic <- topic_of(rd_path)

  txt <- readLines(rd_path, warn = FALSE)
  txt <- unwrap_norun(txt)
  tmp <- tempfile(fileext = ".Rd")
  writeLines(txt, tmp)
  on.exit(unlink(tmp), add = TRUE)

  md_tmp <- tempfile(fileext = ".md")
  on.exit(unlink(md_tmp), add = TRUE)
  suppressWarnings(Rd2markdown(tmp, md_tmp))
  md <- paste(readLines(md_tmp, warn = FALSE), collapse = "\n")

  # First "# Title" becomes the Quarto front-matter title; drop it from the body.
  title <- topic
  h1 <- regmatches(md, regexpr("(?m)^# .*$", md, perl = TRUE))
  if (length(h1)) {
    title <- sub("^# ", "", h1[1])
    md <- sub("(?m)^# .*$\\n?", "", md, perl = TRUE)
  }

  md <- rewrite_links(md, alias_map)

  yaml_title <- gsub('"', '\\\\"', title)
  c("---", sprintf('title: "%s"', yaml_title), "---", "", md)
}

is_internal <- function(rd_path) {
  txt <- paste(readLines(rd_path, warn = FALSE), collapse = "\n")
  grepl("\\\\keyword\\{internal\\}", txt)
}

written <- character(0)
for (rd in rd_files) {
  topic <- topic_of(rd)
  if (is_internal(rd)) {
    message("skip (internal): ", topic)
    next
  }
  page <- convert_one(rd, alias_map)
  writeLines(page, file.path(out_dir, paste0(topic, ".qmd")))
  written <- c(written, topic)
}
message("wrote ", length(written), " reference pages")

# ---- grouped index, mirroring _pkgdown.yml sections ------------------------

build_index <- function() {
  lines <- c("---", 'title: "Function reference"', "---", "")
  grouped <- character(0)

  if (file.exists(pkgdown_yml)) {
    cfg <- yaml::read_yaml(pkgdown_yml)
    for (sec in cfg$reference) {
      title <- sec$title %||% ""
      desc <- sec$desc %||% ""
      contents <- unlist(sec$contents)
      # Keep entries whose page was actually written; an entry may be an alias
      # (print.ferx_job) that resolves to another file's slug (ferx_fit_async).
      slugs <- vapply(contents, function(t) alias_map[[t]] %||% NA_character_,
                      character(1))
      keep <- !is.na(slugs) & slugs %in% written
      contents <- contents[keep]; slugs <- slugs[keep]
      if (!length(contents)) next
      lines <- c(lines, sprintf("## %s", title), "")
      if (nzchar(desc)) lines <- c(lines, desc, "")
      for (i in seq_along(contents)) {
        lines <- c(lines, sprintf("- [`%s`](%s.qmd)", contents[i], slugs[i]))
      }
      lines <- c(lines, "")
      grouped <- c(grouped, slugs)
    }
  }

  leftover <- setdiff(written, grouped)
  if (length(leftover)) {
    lines <- c(lines, "## Other", "")
    for (t in sort(leftover)) lines <- c(lines, sprintf("- [`%s`](%s.qmd)", t, t))
    lines <- c(lines, "")
  }

  writeLines(lines, file.path(out_dir, "index.qmd"))
  message("wrote index: ", length(grouped), " grouped + ",
          length(leftover), " ungrouped")
}

build_index()
