# SPDX-License-Identifier: MIT
"""Fixed local UI resources; never serve arbitrary paths or project assets."""
from importlib.resources import files
from pathlib import Path

ROUTES = {'/workbench': ('index.html', 'text/html'),
          '/workbench/main.js': ('main.ts', 'text/javascript'),
          '/workbench/style.css': ('style.css', 'text/css')}
CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; "
       "img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; "
       "frame-ancestors 'none'; object-src 'none'")


def resource(route):
    name, mime = ROUTES[route]
    packaged = files('design_lab').joinpath('resources', 'workbench', name)
    if packaged.is_file():
        return packaged.read_bytes(), mime
    # Source checkout only; never search the user-supplied project root.
    source = Path(__file__).resolve().parents[2] / 'apps' / 'workbench' / name
    return source.read_bytes(), mime
