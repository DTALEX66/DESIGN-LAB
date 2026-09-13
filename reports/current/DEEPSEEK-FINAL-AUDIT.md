# DeepSeek Final Audit - DL-TP-20260914-DEEPSEEK-AUTHORITY-R1

Subject: `a279b24e4499536edb49cebd9d855377fc94ce50` on branch `codex/deepseek-authority-r1`. Written 2026-09-13T17:10:14+00:00.

#
#
 
R
e
p
o
s
i
t
o
r
y
 
N
o
r
m
a
l
i
z
a
t
i
o
n
 
R
e
p
o
r
t




R
e
p
o
s
i
t
o
r
y
 
d
i
r
e
c
t
o
r
y
 
s
c
h
e
m
e
 
a
u
d
i
t
e
d
:
 
C
O
N
F
O
R
M
 
1
4
,
 
D
E
V
I
A
T
I
O
N
 
1
 
(
d
e
s
i
g
n
-
l
a
b
 
d
u
a
l
 
s
c
h
e
m
e
)
,
 
E
M
P
T
Y
_
D
I
R
 
1
 
(
s
e
r
v
i
c
e
s
)
,
 
E
X
T
R
A
 
3
 
(
g
i
t
-
i
g
n
o
r
e
d
 
l
o
c
a
l
 
d
i
r
e
c
t
o
r
i
e
s
)
.


L
e
g
a
c
y
 
p
a
t
h
 
s
c
a
n
:
 
a
c
t
i
v
e
 
l
e
g
a
c
y
 
u
s
a
g
e
 
0
;
 
t
h
e
 
r
e
m
a
i
n
i
n
g
 
h
i
t
s
 
a
r
e
 
h
i
s
t
o
r
i
c
a
l
 
r
e
c
o
r
d
s
 
a
n
d
 
g
u
a
r
d
 
m
a
r
k
e
r
s
 
t
h
a
t
 
k
e
e
p
 
t
h
e
 
r
e
f
u
s
a
l
 
v
o
c
a
b
u
l
a
r
y
.


S
i
n
g
l
e
 
w
r
i
t
e
r
 
f
o
r
 
t
a
s
k
 
s
t
a
t
u
s
 
i
s
 
d
e
s
i
g
n
-
l
a
b
/
c
o
n
f
i
g
/
t
a
s
k
-
l
e
d
g
e
r
-
r
3
.
j
s
o
n
;
 
t
h
e
 
m
a
c
h
i
n
e
 
a
u
t
h
o
r
i
t
y
 
l
e
d
g
e
r
 
h
a
s
 
o
n
e
 
w
r
i
t
e
r
 
s
c
r
i
p
t
 
a
n
d
 
`
v
e
r
i
f
y
`
 
p
a
s
s
e
s
 
f
o
r
 
a
l
l
 
5
8
 
t
a
s
k
s
.


c
u
r
r
e
n
t
/
 
a
n
d
 
h
i
s
t
o
r
y
/
 
a
r
e
 
s
e
p
a
r
a
t
e
d
:
 
s
u
p
e
r
s
e
d
e
d
 
p
a
c
k
s
 
l
i
v
e
 
u
n
d
e
r
 
d
o
c
s
/
h
i
s
t
o
r
y
/
 
a
n
d
 
a
r
e
 
c
l
a
s
s
i
f
i
e
d
 
a
s
 
H
I
S
T
O
R
Y
 
o
r
 
A
C
T
I
V
E
_
P
R
O
D
U
C
T
_
P
A
C
K
,
 
n
e
v
e
r
 
a
s
 
a
 
d
i
s
p
a
t
c
h
 
e
n
t
r
y
.


P
r
o
j
e
c
t
 
s
t
a
t
u
s
 
p
r
o
j
e
c
t
i
o
n
s
 
b
i
n
d
 
s
u
b
j
e
c
t
 
t
y
p
e
,
 
w
o
r
k
t
r
e
e
 
d
i
g
e
s
t
 
a
n
d
 
t
a
s
k
p
a
c
k
 
i
d
e
n
t
i
t
y
,
 
a
n
d
 
r
e
f
u
s
e
 
t
o
 
p
r
e
s
e
n
t
 
a
 
d
i
r
t
y
 
t
r
e
e
 
a
s
 
a
 
c
o
m
m
i
t
.


#
#
 
L
a
n
g
u
a
g
e
 
G
o
v
e
r
n
a
n
c
e
 
R
e
p
o
r
t




L
a
n
g
u
a
g
e
 
i
n
v
e
n
t
o
r
y
:
 
1
8
9
1
 
t
r
a
c
k
e
d
 
f
i
l
e
s
,
 
1
5
 
l
a
n
g
u
a
g
e
s
,
 
u
n
m
a
p
p
e
d
 
e
x
t
e
n
s
i
o
n
 
f
i
l
e
s
:
 
1
3
1
.


L
a
n
g
u
a
g
e
 
b
o
u
n
d
a
r
y
 
g
a
t
e
 
v
e
r
d
i
c
t
:
 
P
A
S
S
;
 
f
o
r
b
i
d
d
e
n
 
l
a
n
g
u
a
g
e
 
f
i
l
e
s
:
 
0
.


P
y
t
h
o
n
 
o
w
n
s
 
t
h
e
 
r
u
n
t
i
m
e
;
 
t
h
e
 
f
i
x
t
u
r
e
 
o
w
n
s
 
t
h
e
 
o
n
l
y
 
N
o
d
e
 
m
a
n
i
f
e
s
t
;
 
J
a
v
a
 
i
s
 
s
c
o
p
e
d
 
t
o
 
a
n
 
i
n
e
r
t
 
f
i
x
t
u
r
e
 
b
l
o
b
;
 
R
u
s
t
 
i
s
 
c
o
n
d
i
t
i
o
n
a
l
 
a
n
d
 
a
b
s
e
n
t
.


J
S
O
N
 
S
c
h
e
m
a
 
r
e
m
a
i
n
s
 
t
h
e
 
c
r
o
s
s
-
l
a
n
g
u
a
g
e
 
c
o
n
t
r
a
c
t
 
t
r
u
t
h
:
 
c
a
n
o
n
i
c
a
l
 
v
o
c
a
b
u
l
a
r
i
e
s
 
a
r
e
 
r
e
a
d
 
f
r
o
m
 
t
h
e
 
o
w
n
i
n
g
 
s
c
h
e
m
a
s
 
a
n
d
 
e
v
e
r
y
 
d
e
t
e
c
t
e
d
 
h
a
n
d
-
w
r
i
t
t
e
n
 
c
o
p
y
 
m
u
s
t
 
a
g
r
e
e
 
w
i
t
h
 
t
h
e
m
.


T
h
e
 
c
o
p
y
 
c
o
u
n
t
 
i
s
 
a
 
l
o
w
e
r
 
b
o
u
n
d
 
m
e
a
s
u
r
e
d
 
b
y
 
a
 
l
i
n
e
-
l
e
v
e
l
 
d
e
t
e
c
t
o
r
;
 
i
t
 
i
s
 
n
o
t
 
a
 
c
o
m
p
l
e
t
e
n
e
s
s
 
a
u
d
i
t
 
a
n
d
 
a
 
f
a
l
l
 
i
n
 
t
h
e
 
n
u
m
b
e
r
 
i
s
 
n
o
t
 
e
v
i
d
e
n
c
e
 
t
h
a
t
 
a
 
c
o
p
y
 
w
a
s
 
l
o
s
t
.


#
#
 
R
e
p
o
s
i
t
o
r
y
 
S
l
i
m
m
i
n
g
 
R
e
p
o
r
t




R
e
c
l
a
i
m
e
d
 
b
y
 
c
l
e
a
n
u
p
:
 
3
1
6
.
7
9
 
M
i
B
 
a
c
r
o
s
s
 
1
6
7
 
c
a
c
h
e
/
t
e
m
p
 
e
n
t
r
i
e
s
,
 
e
a
c
h
 
w
i
t
h
 
a
 
d
i
g
e
s
t
 
a
n
d
 
a
 
r
e
c
r
e
a
t
i
o
n
 
n
o
t
e
.


N
o
 
l
i
k
e
-
f
o
r
-
l
i
k
e
 
b
e
f
o
r
e
/
a
f
t
e
r
 
e
x
i
s
t
s
 
f
o
r
 
t
h
e
 
r
u
n
t
i
m
e
 
r
o
o
t
s
,
 
a
n
d
 
n
o
n
e
 
i
s
 
c
l
a
i
m
e
d
:
 
t
h
e
 
e
a
r
l
i
e
s
t
 
r
e
c
o
r
d
e
d
 
r
e
a
d
i
n
g
 
p
o
s
t
-
d
a
t
e
s
 
t
h
e
 
d
e
l
e
t
i
o
n
 
i
t
 
w
o
u
l
d
 
s
e
r
v
e
 
a
s
 
a
 
'
b
e
f
o
r
e
'
 
f
o
r
.
 
S
e
e
 
P
O
S
T
-
C
L
E
A
N
U
P
-
A
U
D
I
T
.
j
s
o
n
#
b
e
f
o
r
e
_
a
f
t
e
r
.


G
i
t
 
p
a
c
k
:
 
c
u
r
r
e
n
t
 
s
i
z
e
 
r
e
c
o
r
d
e
d
;
 
t
h
e
 
e
a
r
l
i
e
r
 
p
a
c
k
 
s
t
a
t
e
 
i
s
 
n
o
t
 
r
e
c
o
v
e
r
a
b
l
e
,
 
s
o
 
n
o
 
p
a
c
k
 
r
e
d
u
c
t
i
o
n
 
i
s
 
c
l
a
i
m
e
d
.


T
h
i
r
d
-
p
a
r
t
y
 
f
u
l
l
 
s
o
u
r
c
e
 
t
r
e
e
s
 
a
r
e
 
n
o
t
 
t
r
a
c
k
e
d
 
(
N
O
_
F
U
L
L
_
T
H
I
R
D
_
P
A
R
T
Y
_
S
O
U
R
C
E
_
T
R
E
E
S
_
T
R
A
C
K
E
D
)
:
 
3
 
p
r
e
s
e
n
t
 
i
n
 
t
h
e
 
t
r
e
e
,
 
3
7
 
o
n
l
y
 
i
n
 
a
n
 
i
g
n
o
r
e
d
 
c
a
c
h
e
,
 
6
 
v
i
a
 
l
o
c
k
 
r
e
f
e
r
e
n
c
e
.


E
v
i
d
e
n
c
e
-
b
e
a
r
i
n
g
 
r
u
n
t
i
m
e
 
d
i
r
e
c
t
o
r
i
e
s
 
w
e
r
e
 
N
O
T
 
d
e
l
e
t
e
d
;
 
t
h
e
y
 
a
r
e
 
l
i
s
t
e
d
 
f
o
r
 
o
w
n
e
r
 
a
p
p
r
o
v
a
l
,
 
w
h
i
c
h
 
i
s
 
t
h
e
 
o
n
l
y
 
p
a
t
h
 
t
h
e
 
t
a
s
k
p
a
c
k
 
a
l
l
o
w
s
 
f
o
r
 
t
h
e
m
.


#
#
 
D
a
t
a
 
S
p
i
l
l
 
M
i
g
r
a
t
i
o
n
 
R
e
p
o
r
t




C
e
n
s
u
s
 
v
e
r
d
i
c
t
:
 
C
E
N
S
U
S
_
C
O
M
P
L
E
T
E
;
 
s
c
o
p
e
 
i
s
 
m
e
t
a
d
a
t
a
 
a
n
d
 
p
a
t
h
 
l
e
v
e
l
 
o
n
l
y
.


D
E
S
I
G
N
-
L
A
B
-
o
w
n
e
d
 
l
e
g
a
c
y
 
o
b
j
e
c
t
s
 
m
i
g
r
a
t
e
d
:
 
1
0
 
(
1
1
5
6
5
1
3
8
 
b
y
t
e
s
)
,
 
w
i
t
h
 
p
e
r
-
o
b
j
e
c
t
 
d
i
g
e
s
t
s
 
a
n
d
 
r
e
s
t
o
r
e
 
p
a
t
h
s
.


E
m
p
t
y
 
l
e
g
a
c
y
 
d
i
r
e
c
t
o
r
i
e
s
 
c
l
e
a
r
e
d
 
b
y
 
t
h
e
 
m
i
g
r
a
t
i
o
n
:
 
3
 
(
t
h
e
 
n
a
m
e
s
p
a
c
e
 
h
e
l
d
 
e
m
p
t
y
 
d
i
r
e
c
t
o
r
i
e
s
 
o
n
l
y
,
 
s
o
 
n
o
t
h
i
n
g
 
w
i
t
h
 
c
o
n
t
e
n
t
 
w
a
s
 
d
e
l
e
t
e
d
)
.


R
e
f
u
s
e
d
 
a
s
 
a
g
e
n
t
-
n
a
t
i
v
e
:
 
.
h
e
r
m
e
s
/
s
k
i
l
l
-
c
a
l
l
-
i
n
d
e
x
.
j
s
o
n
 
(
D
O
_
N
O
T
_
T
O
U
C
H
)
.


N
o
 
p
r
i
v
a
t
e
 
s
e
s
s
i
o
n
,
 
c
r
e
d
e
n
t
i
a
l
,
 
s
i
b
l
i
n
g
 
p
r
o
j
e
c
t
 
o
r
 
E
:
 
d
r
i
v
e
 
c
o
n
t
e
n
t
 
w
a
s
 
r
e
a
d
 
a
t
 
a
n
y
 
p
o
i
n
t
 
i
n
 
t
h
i
s
 
r
u
n
.


#
#
 
C
o
n
t
r
a
c
t
 
G
r
a
p
h
 
R
e
p
o
r
t




C
o
n
t
r
a
c
t
 
g
r
a
p
h
:
 
1
1
 
c
o
n
c
e
p
t
s
,
 
0
 
u
n
r
e
s
o
l
v
e
d
 
l
i
n
k
s
,
 
v
e
r
d
i
c
t
 
N
O
_
B
R
O
K
E
N
_
L
I
N
K
.


C
o
n
s
u
m
e
r
 
e
d
g
e
s
 
a
r
e
 
v
e
r
i
f
i
e
d
,
 
n
o
t
 
a
s
s
e
r
t
e
d
:
 
a
 
d
e
c
l
a
r
e
d
 
c
o
n
s
u
m
e
r
 
m
u
s
t
 
r
e
f
e
r
e
n
c
e
 
t
h
e
 
c
o
n
c
e
p
t
'
s
 
p
r
o
d
u
c
e
r
 
m
o
d
u
l
e
,
 
t
a
b
l
e
 
o
r
 
s
c
h
e
m
a
 
i
n
 
e
x
e
c
u
t
a
b
l
e
 
c
o
d
e
.
 
C
o
m
m
e
n
t
s
 
a
n
d
 
d
o
c
s
t
r
i
n
g
s
 
d
o
 
n
o
t
 
c
o
u
n
t
.


A
n
 
i
n
d
e
p
e
n
d
e
n
t
 
a
u
d
i
t
 
f
o
u
n
d
 
o
n
e
 
f
i
c
t
i
o
n
a
l
 
e
d
g
e
 
(
Q
A
 
n
a
m
e
d
 
a
 
f
i
l
e
 
t
h
a
t
 
n
e
v
e
r
 
r
e
f
e
r
e
n
c
e
d
 
i
t
s
 
p
r
o
d
u
c
e
r
)
;
 
w
i
d
e
n
i
n
g
 
t
h
e
 
s
a
m
e
 
c
h
e
c
k
 
f
o
u
n
d
 
f
i
v
e
 
m
o
r
e
,
 
a
n
d
 
a
l
l
 
s
i
x
 
d
e
c
l
a
r
a
t
i
o
n
s
 
w
e
r
e
 
r
e
p
l
a
c
e
d
 
w
i
t
h
 
v
e
r
i
f
i
e
d
 
r
e
a
d
e
r
s
.
 
T
h
e
 
s
t
r
u
c
t
u
r
a
l
 
f
i
n
d
i
n
g
 
b
e
h
i
n
d
 
t
h
e
m
 
i
s
 
r
e
c
o
r
d
e
d
 
i
n
 
t
h
e
 
g
r
a
p
h
:
 
n
o
 
p
r
o
d
u
c
t
i
o
n
 
P
y
t
h
o
n
 
m
o
d
u
l
e
 
i
m
p
o
r
t
s
 
a
n
o
t
h
e
r
 
c
r
e
a
t
i
v
e
 
c
o
n
c
e
p
t
 
m
o
d
u
l
e
,
 
b
e
c
a
u
s
e
 
t
h
o
s
e
 
c
o
n
c
e
p
t
s
 
a
r
e
 
p
e
e
r
s
 
j
o
i
n
e
d
 
t
h
r
o
u
g
h
 
t
h
e
 
s
t
a
t
e
 
d
a
t
a
b
a
s
e
.


c
r
e
a
t
i
v
e
-
v
1
 
m
i
g
r
a
t
i
o
n
 
w
a
s
 
r
e
h
e
a
r
s
e
d
 
t
o
 
c
o
m
p
l
e
t
i
o
n
 
o
n
 
a
 
c
o
p
y
 
(
1
5
/
1
5
 
s
t
e
p
s
,
 
z
e
r
o
 
w
r
i
t
e
s
 
t
o
 
a
n
y
 
p
r
e
-
e
x
i
s
t
i
n
g
 
d
a
t
a
b
a
s
e
)
 
a
n
d
 
i
s
 
s
t
i
l
l
 
m
a
r
k
e
d
 
M
I
G
R
A
T
I
O
N
_
C
A
N
D
I
D
A
T
E
_
P
E
N
D
I
N
G
_
A
U
D
I
T
,
 
n
o
t
 
a
c
c
e
p
t
e
d
 
a
s
 
p
r
o
d
u
c
t
i
o
n
.


S
t
a
n
d
a
r
d
s
 
a
l
i
g
n
m
e
n
t
:
 
D
T
C
G
 
2
0
2
5
.
1
0
 
c
a
n
o
n
i
c
a
l
 
w
i
t
h
 
l
e
g
a
c
y
 
b
e
h
i
n
d
 
a
n
 
a
d
a
p
t
e
r
,
 
O
T
I
O
 
o
f
f
i
c
i
a
l
 
t
r
a
n
s
i
t
i
o
n
 
o
f
f
s
e
t
s
,
 
C
2
P
A
 
2
.
4
 
c
l
a
i
m
 
s
t
r
u
c
t
u
r
e
 
(
u
n
s
i
g
n
e
d
 
a
n
d
 
n
e
v
e
r
 
s
i
g
n
e
d
 
h
e
r
e
)
,
 
P
e
n
p
o
t
 
v
3
 
a
r
c
h
i
v
e
 
v
a
l
i
d
a
t
i
o
n
,
 
G
L
B
 
a
c
c
e
s
s
o
r
 
m
a
t
r
i
x
 
c
o
v
e
r
a
g
e
,
 
Q
A
 
a
u
t
o
m
a
t
i
o
n
/
m
o
d
e
l
/
h
u
m
a
n
 
b
o
u
n
d
a
r
y
.


#
#
 
M
e
a
s
u
r
e
d
 
r
e
p
o
s
i
t
o
r
y
 
s
t
a
t
e




|
 
I
t
e
m
 
|
 
V
a
l
u
e
 
|


|
-
-
-
|
-
-
-
|


|
 
t
r
a
c
k
e
d
 
f
i
l
e
s
 
b
e
f
o
r
e
 
|
 
1
8
3
2
 
|


|
 
t
r
a
c
k
e
d
 
f
i
l
e
s
 
a
f
t
e
r
 
|
 
1
9
0
4
 
|


|
 
t
r
a
c
k
e
d
 
M
i
B
 
b
e
f
o
r
e
 
|
 
3
0
.
1
5
 
|


|
 
t
r
a
c
k
e
d
 
M
i
B
 
a
f
t
e
r
 
|
 
3
1
.
0
9
 
|


|
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
M
i
B
 
n
o
w
 
|
 
4
5
0
1
.
1
6
 
|


|
 
r
e
c
l
a
i
m
e
d
 
M
i
B
 
|
 
3
1
6
.
7
9
 
|


|
 
g
i
t
 
p
a
c
k
 
M
i
B
 
n
o
w
 
|
 
2
1
0
.
4
 
|


|
 
t
h
i
r
d
-
p
a
r
t
y
 
f
u
l
l
 
c
o
p
i
e
s
 
t
r
a
c
k
e
d
 
|
 
3
 
|


|
 
s
p
i
l
l
 
o
b
j
e
c
t
s
 
m
i
g
r
a
t
e
d
 
|
 
1
0
 
|


|
 
e
m
p
t
y
 
l
e
g
a
c
y
 
d
i
r
e
c
t
o
r
i
e
s
 
c
l
e
a
r
e
d
 
|
 
3
 
|


#
#
 
R
e
m
a
i
n
i
n
g
 
e
x
c
e
p
t
i
o
n
s




|
 
A
r
e
a
 
|
 
S
t
a
t
e
 
|
 
E
x
c
e
p
t
i
o
n
 
|


|
-
-
-
|
-
-
-
|
-
-
-
|


|
 
t
h
i
r
d
-
p
a
r
t
y
 
l
o
c
k
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
7
 
o
f
 
4
6
 
s
o
u
r
c
e
s
.
l
o
c
k
 
e
n
t
r
i
e
s
 
c
a
r
r
y
 
n
o
 
c
a
n
o
n
i
c
a
l
 
U
R
L
 
a
n
d
 
0
 
c
a
r
r
y
 
a
 
p
i
n
n
e
d
 
r
e
v
i
s
i
o
n
;
 
t
h
e
 
l
o
c
k
 
r
e
c
o
r
d
s
 
w
h
a
t
 
i
s
 
a
b
s
o
r
b
e
d
,
 
n
o
t
 
w
h
e
r
e
 
t
o
 
f
e
t
c
h
 
i
t
 
|


|
 
r
u
n
t
i
m
e
 
v
o
l
u
m
e
 
|
 
O
W
N
E
R
_
D
E
L
E
T
E
_
A
P
P
R
O
V
A
L
_
R
E
Q
U
I
R
E
D
 
|
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
h
o
l
d
s
 
e
v
i
d
e
n
c
e
-
b
e
a
r
i
n
g
 
r
u
n
 
d
i
r
e
c
t
o
r
i
e
s
 
l
e
f
t
 
i
n
 
p
l
a
c
e
 
a
t
 
O
W
N
E
R
_
D
E
L
E
T
E
_
A
P
P
R
O
V
A
L
_
R
E
Q
U
I
R
E
D
;
 
r
e
c
l
a
i
m
i
n
g
 
t
h
e
m
 
n
e
e
d
s
 
o
w
n
e
r
 
a
p
p
r
o
v
a
l
 
|


|
 
p
y
t
h
o
n
 
t
o
o
l
i
n
g
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
r
u
f
f
 
i
s
 
d
e
c
l
a
r
e
d
 
i
n
 
p
y
p
r
o
j
e
c
t
 
b
u
t
 
i
s
 
n
o
t
 
i
n
s
t
a
l
l
e
d
,
 
s
o
 
l
i
n
t
 
i
s
 
n
o
t
 
e
n
f
o
r
c
e
d
 
b
y
 
a
n
y
 
g
a
t
e
;
 
p
y
t
e
s
t
 
i
s
 
n
o
t
 
i
n
s
t
a
l
l
e
d
 
a
n
d
 
t
h
e
 
s
u
i
t
e
 
r
u
n
s
 
u
n
d
e
r
 
u
n
i
t
t
e
s
t
.
 
T
h
e
 
d
e
p
e
n
d
e
n
c
y
 
l
o
c
k
 
i
t
s
e
l
f
 
i
s
 
p
r
e
s
e
n
t
:
 
u
v
.
l
o
c
k
 
a
n
d
 
r
e
q
u
i
r
e
m
e
n
t
s
.
t
x
t
 
a
r
e
 
b
o
t
h
 
t
r
a
c
k
e
d
 
|


|
 
n
o
d
e
 
t
o
o
l
i
n
g
 
|
 
B
Y
_
D
E
S
I
G
N
 
|
 
n
o
 
p
r
o
d
u
c
t
 
N
o
d
e
 
p
a
c
k
a
g
e
 
e
x
i
s
t
s
:
 
t
h
e
 
o
n
l
y
 
m
a
n
i
f
e
s
t
 
b
e
l
o
n
g
s
 
t
o
 
t
h
e
 
g
a
m
e
-
v
i
s
u
a
l
 
f
i
x
t
u
r
e
,
 
a
n
d
 
t
h
e
r
e
 
i
s
 
n
o
 
l
o
c
k
f
i
l
e
 
|


|
 
t
r
a
c
k
e
d
 
b
a
c
k
u
p
s
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
d
e
s
i
g
n
-
l
a
b
/
c
o
n
f
i
g
/
c
a
p
a
b
i
l
i
t
y
-
i
n
d
e
x
-
v
1
-
b
a
c
k
u
p
.
j
s
o
n
 
(
4
4
5
 
K
B
)
 
i
s
 
s
t
i
l
l
 
t
r
a
c
k
e
d
 
|


|
 
l
e
g
a
c
y
 
p
a
c
k
a
g
e
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
d
e
s
i
g
n
-
l
a
b
/
c
o
r
e
 
i
s
 
a
n
 
u
n
u
s
e
d
 
l
e
g
a
c
y
 
p
a
c
k
a
g
e
 
o
u
t
s
i
d
e
 
t
h
e
 
d
e
c
l
a
r
e
d
 
l
a
y
o
u
t
 
|


|
 
e
m
p
t
y
 
d
i
r
e
c
t
o
r
y
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
s
e
r
v
i
c
e
s
/
 
i
s
 
a
n
 
e
m
p
t
y
 
t
r
a
c
k
e
d
-
a
d
j
a
c
e
n
t
 
d
i
r
e
c
t
o
r
y
 
(
E
M
P
T
Y
_
D
I
R
 
d
e
v
i
a
t
i
o
n
 
i
n
 
t
h
e
 
d
i
r
e
c
t
o
r
y
 
a
u
d
i
t
)
 
|


|
 
l
i
v
e
 
d
a
t
a
b
a
s
e
 
|
 
N
O
T
_
V
E
R
I
F
I
A
B
L
E
_
A
S
_
S
T
A
T
E
D
 
|
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
/
s
t
a
t
e
/
 
d
o
e
s
 
n
o
t
 
e
x
i
s
t
,
 
s
o
 
a
 
c
l
a
i
m
 
t
h
a
t
 
'
t
h
e
 
l
i
v
e
 
d
a
t
a
b
a
s
e
 
i
s
 
u
n
m
o
d
i
f
i
e
d
'
 
i
s
 
n
o
t
 
v
e
r
i
f
i
a
b
l
e
 
a
s
 
s
t
a
t
e
d
;
 
t
h
e
 
p
r
o
x
y
 
u
s
e
d
 
i
s
 
t
h
a
t
 
n
o
 
*
.
d
b
 
u
n
d
e
r
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
c
h
a
n
g
e
d
 
|


|
 
a
g
e
n
t
-
n
a
t
i
v
e
 
a
r
t
i
f
a
c
t
 
|
 
R
E
F
U
S
E
D
_
B
Y
_
P
O
L
I
C
Y
 
|
 
.
h
e
r
m
e
s
/
s
k
i
l
l
-
c
a
l
l
-
i
n
d
e
x
.
j
s
o
n
 
i
s
 
n
o
t
 
p
r
o
v
a
b
l
y
 
D
E
S
I
G
N
-
L
A
B
-
o
w
n
e
d
 
a
n
d
 
i
s
 
l
e
f
t
 
u
n
t
o
u
c
h
e
d
 
(
D
O
_
N
O
T
_
T
O
U
C
H
)
 
|


|
 
m
e
a
s
u
r
e
m
e
n
t
 
|
 
W
I
T
H
D
R
A
W
N
_
C
L
A
I
M
 
|
 
n
o
 
l
i
k
e
-
f
o
r
-
l
i
k
e
 
b
e
f
o
r
e
/
a
f
t
e
r
 
e
x
i
s
t
s
 
f
o
r
 
t
h
e
 
r
u
n
t
i
m
e
 
r
o
o
t
s
 
o
r
 
t
h
e
 
g
i
t
 
p
a
c
k
,
 
s
o
 
t
h
e
 
o
n
l
y
 
r
e
d
u
c
t
i
o
n
 
c
l
a
i
m
e
d
 
i
s
 
t
h
e
 
d
i
g
e
s
t
-
b
a
c
k
e
d
 
r
e
c
l
a
i
m
e
d
 
b
y
t
e
 
c
o
u
n
t
 
|


#
#
 
D
o
n
e
-
W
h
e
n
 
c
r
i
t
e
r
i
a




|
 
I
t
e
m
 
|
 
V
a
l
u
e
 
|


|
-
-
-
|
-
-
-
|


|
 
1
.
 
t
h
e
 
t
a
s
k
p
a
c
k
 
i
s
 
l
a
n
d
e
d
 
w
i
t
h
 
a
 
S
H
A
-
2
5
6
 
[
M
E
T
]
 
|
 
d
o
c
s
/
t
a
s
k
p
a
c
k
s
/
D
E
S
I
G
N
-
L
A
B
-
D
E
E
P
S
E
E
K
-
A
U
T
H
O
R
I
T
Y
-
T
A
S
K
P
A
C
K
-
2
0
2
6
-
0
9
-
1
4
.
m
d
,
 
s
h
a
2
5
6
 
d
9
f
d
a
a
3
a
d
7
a
d
0
0
5
5
a
3
f
4
5
1
c
8
5
3
7
5
6
b
e
4
1
0
3
6
b
3
2
1
1
2
c
a
c
c
4
d
1
c
1
7
b
3
1
4
c
0
0
5
a
2
f
9
;
 
l
e
d
g
e
r
 
v
e
r
i
f
y
 
p
a
s
s
e
s
 
f
o
r
 
a
l
l
 
5
8
 
t
a
s
k
s
 
|


|
 
2
.
 
A
G
E
N
T
S
.
m
d
 
p
o
i
n
t
s
 
a
t
 
t
h
e
 
s
i
n
g
l
e
 
c
u
r
r
e
n
t
 
D
e
e
p
S
e
e
k
 
t
a
s
k
p
a
c
k
 
[
M
E
T
]
 
|
 
A
G
E
N
T
S
.
m
d
 
n
a
m
e
s
 
o
n
e
 
c
u
r
r
e
n
t
 
D
e
e
p
S
e
e
k
 
p
a
c
k
;
 
t
h
e
 
a
u
t
h
o
r
i
t
y
 
c
h
a
i
n
 
c
l
a
s
s
i
f
i
e
s
 
3
8
 
e
n
t
r
i
e
s
 
|


|
 
3
.
 
o
l
d
 
t
a
s
k
p
a
c
k
 
a
u
t
h
o
r
i
t
y
 
r
e
l
a
t
i
o
n
s
 
a
r
e
 
e
x
p
l
i
c
i
t
 
[
M
E
T
]
 
|
 
r
e
p
o
r
t
s
/
c
u
r
r
e
n
t
/
D
E
E
P
S
E
E
K
-
A
U
T
H
O
R
I
T
Y
-
C
H
A
I
N
.
j
s
o
n
:
 
2
 
C
U
R
R
E
N
T
_
D
E
E
P
S
E
E
K
_
A
U
T
H
O
R
I
T
Y
,
 
1
2
 
A
C
T
I
V
E
_
P
R
O
D
U
C
T
_
P
A
C
K
,
 
2
 
G
O
V
E
R
N
A
N
C
E
_
T
R
U
T
H
,
 
1
4
 
H
I
S
T
O
R
I
C
A
L
,
 
8
 
R
E
F
E
R
E
N
C
E
 
|


|
 
4
.
 
t
h
e
 
d
i
r
t
y
 
w
o
r
k
t
r
e
e
 
i
s
 
a
t
t
r
i
b
u
t
e
d
 
a
n
d
 
f
r
o
z
e
n
 
[
M
E
T
]
 
|
 
r
e
p
o
r
t
s
/
c
u
r
r
e
n
t
/
D
E
E
P
S
E
E
K
-
W
O
R
K
T
R
E
E
-
I
N
V
E
N
T
O
R
Y
.
j
s
o
n
:
 
9
7
/
9
7
 
f
i
l
e
s
 
c
l
a
s
s
i
f
i
e
d
,
 
0
 
U
N
P
R
O
V
E
N
 
|


|
 
5
.
 
e
v
e
r
y
 
a
c
t
i
v
e
 
c
o
d
e
 
p
a
t
h
 
m
a
p
s
 
t
o
 
a
 
t
a
s
k
 
[
M
E
T
_
W
I
T
H
_
E
X
C
E
P
T
I
O
N
]
 
|
 
t
h
e
 
f
r
o
z
e
n
 
d
e
l
t
a
 
i
s
 
f
u
l
l
y
 
a
t
t
r
i
b
u
t
e
d
 
a
g
a
i
n
s
t
 
t
h
e
 
p
a
c
k
;
 
t
h
e
 
e
x
c
e
p
t
i
o
n
 
i
s
 
d
e
s
i
g
n
-
l
a
b
/
c
o
r
e
,
 
a
n
 
u
n
u
s
e
d
 
l
e
g
a
c
y
 
p
a
c
k
a
g
e
 
o
u
t
s
i
d
e
 
t
h
e
 
d
e
c
l
a
r
e
d
 
l
a
y
o
u
t
 
-
-
 
G
A
P
:
 
d
e
s
i
g
n
-
l
a
b
/
c
o
r
e
 
i
s
 
r
e
t
a
i
n
e
d
 
a
n
d
 
r
e
p
o
r
t
e
d
,
 
n
o
t
 
a
d
o
p
t
e
d
 
o
r
 
d
e
l
e
t
e
d
 
|


|
 
6
.
 
t
h
e
 
r
e
p
o
s
i
t
o
r
y
 
h
a
s
 
e
x
a
c
t
l
y
 
o
n
e
 
c
u
r
r
e
n
t
 
d
i
r
e
c
t
o
r
y
 
s
c
h
e
m
e
 
[
M
E
T
_
W
I
T
H
_
E
X
C
E
P
T
I
O
N
]
 
|
 
r
e
p
o
r
t
s
/
c
u
r
r
e
n
t
/
D
E
E
P
S
E
E
K
-
D
I
R
E
C
T
O
R
Y
-
A
U
D
I
T
.
j
s
o
n
:
 
C
O
N
F
O
R
M
 
1
4
,
 
D
E
V
I
A
T
I
O
N
 
1
 
(
d
e
s
i
g
n
-
l
a
b
 
d
u
a
l
 
s
c
h
e
m
e
)
,
 
E
M
P
T
Y
_
D
I
R
 
1
 
(
s
e
r
v
i
c
e
s
)
,
 
E
X
T
R
A
 
3
 
(
g
i
t
-
i
g
n
o
r
e
d
 
l
o
c
a
l
 
d
i
r
e
c
t
o
r
i
e
s
)
 
-
-
 
G
A
P
:
 
t
h
e
 
d
e
s
i
g
n
-
l
a
b
 
d
u
a
l
 
s
c
h
e
m
e
 
a
n
d
 
t
h
e
 
e
m
p
t
y
 
s
e
r
v
i
c
e
s
/
 
d
i
r
e
c
t
o
r
y
 
a
r
e
 
r
e
p
o
r
t
e
d
,
 
n
o
t
 
r
e
s
o
l
v
e
d
 
|


|
 
7
.
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
i
s
 
t
h
e
 
s
i
n
g
l
e
 
r
u
n
t
i
m
e
 
r
o
o
t
 
[
M
E
T
]
 
|
 
r
u
n
t
i
m
e
 
r
o
o
t
s
 
m
e
a
s
u
r
e
d
:
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
4
5
0
0
.
9
4
 
M
i
B
 
/
 
6
5
8
3
2
 
f
i
l
e
s
;
 
.
h
e
r
m
e
s
 
h
o
l
d
s
 
n
o
 
c
o
n
t
e
n
t
 
|


|
 
8
.
 
n
o
 
a
c
t
i
v
e
 
.
h
e
r
m
e
s
 
p
r
o
j
e
c
t
 
w
r
i
t
e
s
 
[
M
E
T
]
 
|
 
n
o
 
t
r
a
c
k
e
d
 
.
h
e
r
m
e
s
 
f
i
l
e
s
;
 
t
h
e
 
n
a
m
e
s
p
a
c
e
 
h
o
l
d
s
 
t
w
o
 
E
M
P
T
Y
 
d
i
r
e
c
t
o
r
i
e
s
 
w
h
o
s
e
 
m
t
i
m
e
s
 
s
i
t
 
a
t
 
t
h
e
 
m
i
g
r
a
t
i
o
n
 
i
n
s
t
a
n
t
 
a
n
d
 
o
n
e
 
r
e
f
u
s
e
d
 
a
g
e
n
t
-
n
a
t
i
v
e
 
f
i
l
e
 
|


|
 
9
.
 
r
e
p
o
s
i
t
o
r
y
 
s
i
z
e
 
h
a
s
 
a
 
m
e
a
s
u
r
e
d
 
b
e
f
o
r
e
/
a
f
t
e
r
 
[
M
E
T
_
W
I
T
H
_
E
X
C
E
P
T
I
O
N
]
 
|
 
t
r
a
c
k
e
d
 
f
i
l
e
s
 
1
8
3
2
 
-
>
 
1
8
9
1
 
a
n
d
 
3
0
.
1
5
 
-
>
 
3
0
.
9
7
 
M
i
B
 
f
r
o
m
 
b
a
s
e
 
r
e
v
i
s
i
o
n
 
5
6
3
1
9
6
3
5
,
 
l
i
k
e
-
f
o
r
-
l
i
k
e
 
T
R
U
E
;
 
t
h
e
 
g
i
t
 
p
a
c
k
 
a
n
d
 
r
u
n
t
i
m
e
 
r
o
o
t
s
 
a
r
e
 
N
O
T
 
l
i
k
e
-
f
o
r
-
l
i
k
e
 
-
-
 
G
A
P
:
 
n
o
 
p
a
c
k
 
o
r
 
r
u
n
t
i
m
e
-
r
o
o
t
 
r
e
d
u
c
t
i
o
n
 
i
s
 
c
l
a
i
m
e
d
;
 
t
h
e
 
w
i
t
h
d
r
a
w
a
l
 
i
s
 
c
o
m
p
u
t
e
d
 
i
n
 
t
h
e
 
a
r
t
i
f
a
c
t
 
|


|
 
1
0
.
 
s
a
f
e
l
y
 
d
e
l
e
t
a
b
l
e
 
c
a
c
h
e
/
t
e
m
p
 
i
s
 
r
e
a
l
l
y
 
c
l
e
a
n
e
d
 
[
M
E
T
]
 
|
 
1
6
7
 
e
n
t
r
i
e
s
,
 
3
1
6
.
7
9
 
M
i
B
,
 
p
e
r
-
e
n
t
r
y
 
d
i
g
e
s
t
 
a
n
d
 
r
e
c
r
e
a
t
i
o
n
 
n
o
t
e
 
i
n
 
t
h
e
 
c
l
e
a
n
u
p
 
m
a
n
i
f
e
s
t
 
|


|
 
1
1
.
 
t
h
e
 
s
p
i
l
l
 
c
e
n
s
u
s
 
i
s
 
c
o
m
p
l
e
t
e
 
[
M
E
T
]
 
|
 
r
e
p
o
r
t
s
/
c
u
r
r
e
n
t
/
S
P
I
L
L
-
C
E
N
S
U
S
.
j
s
o
n
 
v
e
r
d
i
c
t
 
C
E
N
S
U
S
_
C
O
M
P
L
E
T
E
 
a
t
 
m
e
t
a
d
a
t
a
 
a
n
d
 
p
a
t
h
 
l
e
v
e
l
 
|


|
 
1
2
.
 
D
E
S
I
G
N
-
L
A
B
-
o
w
n
e
d
 
s
p
i
l
l
 
i
s
 
m
i
g
r
a
t
e
d
 
o
r
 
i
s
 
a
n
 
e
x
p
l
i
c
i
t
 
e
x
c
e
p
t
i
o
n
 
[
M
E
T
]
 
|
 
1
0
 
o
b
j
e
c
t
s
 
/
 
1
1
5
6
5
1
3
8
 
b
y
t
e
s
 
m
i
g
r
a
t
e
d
 
w
i
t
h
 
1
0
 
v
e
r
i
f
i
e
d
 
d
i
g
e
s
t
s
 
a
n
d
 
r
e
s
t
o
r
e
 
p
a
t
h
s
;
 
1
 
o
b
j
e
c
t
 
r
e
f
u
s
e
d
 
a
s
 
a
g
e
n
t
-
n
a
t
i
v
e
 
w
i
t
h
 
D
O
_
N
O
T
_
T
O
U
C
H
 
|


|
 
1
3
.
 
e
v
e
r
y
 
d
e
l
e
t
i
o
n
 
h
a
s
 
a
 
m
a
n
i
f
e
s
t
,
 
a
 
h
a
s
h
 
a
n
d
 
a
 
r
o
l
l
b
a
c
k
 
[
M
E
T
]
 
|
 
c
l
e
a
n
u
p
 
m
a
n
i
f
e
s
t
 
w
i
t
h
 
d
i
g
e
s
t
s
 
a
n
d
 
r
e
c
r
e
a
t
i
o
n
 
n
o
t
e
s
;
 
m
i
g
r
a
t
i
o
n
 
m
a
n
i
f
e
s
t
 
w
i
t
h
 
r
e
s
t
o
r
e
 
c
o
m
m
a
n
d
s
;
 
t
h
e
 
q
u
a
r
a
n
t
i
n
e
 
m
a
n
i
f
e
s
t
 
i
s
 
r
e
s
t
o
r
a
b
l
e
 
|


|
 
1
4
.
 
t
h
e
 
P
y
t
h
o
n
/
T
S
/
H
o
s
t
 
J
S
/
R
u
s
t
 
l
a
n
g
u
a
g
e
 
b
o
u
n
d
a
r
y
 
i
s
 
l
a
n
d
e
d
 
[
M
E
T
]
 
|
 
d
o
c
s
/
a
r
c
h
i
t
e
c
t
u
r
e
/
L
A
N
G
U
A
G
E
-
P
O
L
I
C
Y
.
m
d
,
 
L
A
N
G
U
A
G
E
-
I
N
V
E
N
T
O
R
Y
.
j
s
o
n
 
a
n
d
 
L
A
N
G
U
A
G
E
-
B
O
U
N
D
A
R
Y
-
S
C
A
N
.
j
s
o
n
:
 
0
 
f
o
r
b
i
d
d
e
n
,
 
1
 
f
i
x
t
u
r
e
-
s
c
o
p
e
d
 
(
J
a
v
a
 
i
n
 
a
n
 
i
n
e
r
t
 
b
l
o
b
)
,
 
0
 
c
o
n
d
i
t
i
o
n
a
l
 
|


|
 
1
5
.
 
t
h
e
 
d
e
p
e
n
d
e
n
c
y
 
l
o
c
k
 
i
s
 
u
n
i
q
u
e
 
[
M
E
T
]
 
|
 
u
v
.
l
o
c
k
 
a
n
d
 
r
e
q
u
i
r
e
m
e
n
t
s
.
t
x
t
 
a
r
e
 
t
r
a
c
k
e
d
;
 
o
n
e
 
P
y
t
h
o
n
 
p
r
o
j
e
c
t
 
r
o
o
t
 
a
n
d
 
o
n
e
 
l
o
c
k
f
i
l
e
 
m
a
n
a
g
e
r
;
 
n
o
 
N
o
d
e
 
l
o
c
k
f
i
l
e
 
e
x
i
s
t
s
 
b
e
c
a
u
s
e
 
t
h
e
r
e
 
i
s
 
n
o
 
p
r
o
d
u
c
t
 
N
o
d
e
 
p
a
c
k
a
g
e
 
|


|
 
1
6
.
 
t
h
e
 
c
o
n
t
r
a
c
t
 
g
r
a
p
h
 
h
a
s
 
n
o
 
u
n
e
x
p
l
a
i
n
e
d
 
b
r
o
k
e
n
 
l
i
n
k
 
[
M
E
T
]
 
|
 
r
e
p
o
r
t
s
/
c
u
r
r
e
n
t
/
C
O
N
T
R
A
C
T
-
G
R
A
P
H
.
j
s
o
n
:
 
1
1
 
c
o
n
c
e
p
t
s
,
 
0
 
b
r
e
a
k
s
,
 
e
v
e
r
y
 
c
o
n
s
u
m
e
r
 
e
d
g
e
 
v
e
r
i
f
i
e
d
 
a
g
a
i
n
s
t
 
e
x
e
c
u
t
a
b
l
e
 
c
o
d
e
 
|


|
 
1
7
.
 
t
h
e
 
c
r
e
a
t
i
v
e
 
D
B
 
m
i
g
r
a
t
i
o
n
 
i
s
 
f
u
l
l
y
 
r
e
h
e
a
r
s
e
d
 
o
n
 
a
 
c
o
p
y
 
[
M
E
T
]
 
|
 
1
5
/
1
5
 
s
t
e
p
s
 
p
a
s
s
 
o
n
 
a
 
c
o
p
y
 
w
i
t
h
 
z
e
r
o
 
w
r
i
t
e
s
 
t
o
 
a
n
y
 
p
r
e
-
e
x
i
s
t
i
n
g
 
d
a
t
a
b
a
s
e
;
 
s
t
i
l
l
 
m
a
r
k
e
d
 
M
I
G
R
A
T
I
O
N
_
C
A
N
D
I
D
A
T
E
_
P
E
N
D
I
N
G
_
A
U
D
I
T
 
a
n
d
 
a
c
c
e
p
t
e
d
_
a
s
_
p
r
o
d
u
c
t
i
o
n
 
f
a
l
s
e
 
|


|
 
1
8
.
 
t
h
e
 
f
o
u
n
d
a
t
i
o
n
 
s
t
a
t
e
 
f
i
l
e
s
 
a
r
e
 
i
n
d
e
p
e
n
d
e
n
t
l
y
 
r
e
v
i
e
w
e
d
 
[
M
E
T
]
 
|
 
F
O
U
N
D
A
T
I
O
N
-
A
U
D
I
T
.
j
s
o
n
 
p
a
s
s
e
s
,
 
a
n
d
 
t
h
e
 
i
n
d
e
p
e
n
d
e
n
t
 
a
u
d
i
t
 
r
e
-
r
e
a
d
 
t
h
e
 
s
t
a
t
e
 
l
a
y
e
r
 
w
i
t
h
o
u
t
 
a
c
c
e
s
s
 
t
o
 
t
h
i
s
 
r
u
n
'
s
 
r
e
a
s
o
n
i
n
g
 
|


|
 
1
9
.
 
D
T
C
G
 
c
a
n
o
n
i
c
a
l
 
i
s
 
2
0
2
5
.
1
0
 
[
M
E
T
]
 
|
 
s
r
c
/
d
e
s
i
g
n
_
l
a
b
/
i
n
t
e
r
o
p
/
d
t
c
g
.
p
y
:
 
s
t
r
i
c
t
 
c
a
n
o
n
i
c
a
l
 
s
c
h
e
m
a
,
 
l
e
g
a
c
y
 
b
e
h
i
n
d
 
a
 
n
a
m
e
d
 
a
d
a
p
t
e
r
 
|


|
 
2
0
.
 
O
T
I
O
 
h
a
s
 
n
o
 
i
n
v
e
n
t
e
d
 
c
o
n
f
l
i
c
t
i
n
g
 
s
e
m
a
n
t
i
c
s
 
[
M
E
T
]
 
|
 
s
r
c
/
d
e
s
i
g
n
_
l
a
b
/
i
n
t
e
r
o
p
/
t
i
m
e
l
i
n
e
.
p
y
 
d
e
r
i
v
e
s
 
o
v
e
r
l
a
p
s
 
f
r
o
m
 
t
h
e
 
o
f
f
i
c
i
a
l
 
T
r
a
n
s
i
t
i
o
n
.
1
 
c
o
v
e
r
e
d
-
r
a
n
g
e
 
f
o
r
m
u
l
a
 
|


|
 
2
1
.
 
t
h
e
 
C
2
P
A
 
c
o
n
t
r
a
c
t
 
a
l
i
g
n
s
 
t
o
 
2
.
4
 
[
M
E
T
]
 
|
 
s
r
c
/
d
e
s
i
g
n
_
l
a
b
/
i
n
t
e
r
o
p
/
p
r
o
v
e
n
a
n
c
e
.
p
y
 
p
r
o
j
e
c
t
s
 
o
n
t
o
 
c
2
p
a
.
c
l
a
i
m
.
v
2
 
/
 
c
2
p
a
.
s
i
g
n
a
t
u
r
e
,
 
u
n
s
i
g
n
e
d
 
a
n
d
 
n
e
v
e
r
 
s
i
g
n
e
d
 
h
e
r
e
 
|


|
 
2
2
.
 
t
h
e
 
P
e
n
p
o
t
 
v
a
l
i
d
a
t
o
r
 
a
l
i
g
n
s
 
t
o
 
v
3
 
[
M
E
T
]
 
|
 
s
r
c
/
d
e
s
i
g
n
_
l
a
b
/
i
n
t
e
r
o
p
/
p
e
n
p
o
t
.
p
y
 
v
a
l
i
d
a
t
e
s
 
t
h
e
 
v
3
 
a
r
c
h
i
v
e
 
s
t
r
u
c
t
u
r
e
 
r
e
a
d
-
o
n
l
y
 
|


|
 
2
3
.
 
t
h
e
 
G
L
B
 
v
a
l
i
d
a
t
o
r
 
i
s
 
J
S
O
N
-
s
a
f
e
 
a
n
d
 
c
o
v
e
r
s
 
t
h
e
 
a
c
c
e
s
s
o
r
 
m
a
t
r
i
x
 
[
M
E
T
]
 
|
 
s
r
c
/
d
e
s
i
g
n
_
l
a
b
/
m
e
d
i
a
/
t
h
r
e
e
_
d
.
p
y
 
s
p
l
i
t
s
 
p
a
r
s
e
/
v
a
l
i
d
a
t
e
/
s
u
m
m
a
r
i
z
e
 
a
n
d
 
c
o
v
e
r
s
 
M
A
T
2
/
M
A
T
3
/
M
A
T
4
 
a
c
c
e
s
s
o
r
s
;
 
2
9
 
t
e
s
t
s
 
p
a
s
s
 
|


|
 
2
4
.
 
t
h
e
 
Q
A
 
a
u
t
o
m
a
t
i
c
/
m
o
d
e
l
/
h
u
m
a
n
 
b
o
u
n
d
a
r
y
 
i
s
 
e
x
p
l
i
c
i
t
 
[
M
E
T
]
 
|
 
q
a
_
p
l
a
n
e
.
p
y
 
p
o
l
i
c
y
 
i
s
 
f
r
o
z
e
n
:
 
a
u
t
o
m
a
t
i
o
n
 
m
a
y
 
n
o
t
 
b
e
 
f
i
n
a
l
,
 
a
 
h
u
m
a
n
 
v
e
r
d
i
c
t
 
i
s
 
r
e
q
u
i
r
e
d
,
 
m
o
d
e
l
-
a
s
s
i
s
t
e
d
 
f
i
n
d
i
n
g
s
 
e
s
c
a
l
a
t
e
 
i
n
s
t
e
a
d
 
o
f
 
r
e
j
e
c
t
i
n
g
 
|


|
 
2
5
.
 
t
h
e
 
R
i
g
h
t
s
 
R
e
g
i
s
t
r
y
 
i
s
 
c
u
r
r
e
n
t
 
[
M
E
T
_
W
I
T
H
_
E
X
C
E
P
T
I
O
N
]
 
|
 
d
e
s
i
g
n
-
l
a
b
/
c
o
n
f
i
g
/
r
i
g
h
t
s
-
r
e
g
i
s
t
r
y
.
j
s
o
n
 
c
o
v
e
r
s
 
7
4
 
s
u
b
j
e
c
t
s
,
 
4
 
a
d
j
u
d
i
c
a
t
e
d
 
-
-
 
G
A
P
:
 
7
0
 
s
u
b
j
e
c
t
s
 
r
e
m
a
i
n
 
N
O
T
_
A
D
J
U
D
I
C
A
T
E
D
 
a
n
d
 
a
r
e
 
c
a
r
r
i
e
d
 
a
s
 
a
n
 
e
x
c
e
p
t
i
o
n
 
|


|
 
2
6
.
 
H
3
 
h
a
s
 
n
o
t
 
b
y
p
a
s
s
e
d
 
t
h
e
 
R
i
g
h
t
s
 
G
a
t
e
 
[
M
E
T
]
 
|
 
a
d
a
p
t
e
r
 
s
t
a
t
u
s
 
B
L
O
C
K
E
D
_
B
Y
_
L
I
C
E
N
S
E
 
e
v
e
r
y
w
h
e
r
e
;
 
t
h
e
 
m
a
n
i
f
e
s
t
 
c
l
a
i
m
s
 
n
o
 
s
u
p
p
o
r
t
e
d
 
c
a
p
a
b
i
l
i
t
y
;
 
n
o
t
h
i
n
g
 
w
a
s
 
d
o
w
n
l
o
a
d
e
d
 
o
r
 
r
u
n
 
|


|
 
2
7
.
 
t
h
i
r
d
-
p
a
r
t
y
 
s
o
u
r
c
e
s
 
a
r
e
 
m
i
n
i
m
a
l
l
y
 
a
b
s
o
r
b
e
d
 
o
r
 
l
o
c
k
e
d
 
[
M
E
T
_
W
I
T
H
_
E
X
C
E
P
T
I
O
N
]
 
|
 
v
e
r
d
i
c
t
 
N
O
_
F
U
L
L
_
T
H
I
R
D
_
P
A
R
T
Y
_
S
O
U
R
C
E
_
T
R
E
E
S
_
T
R
A
C
K
E
D
:
 
0
 
t
r
a
c
k
e
d
 
f
u
l
l
 
c
o
p
i
e
s
,
 
3
7
 
o
n
l
y
 
i
n
 
a
n
 
i
g
n
o
r
e
d
 
c
a
c
h
e
,
 
6
 
v
i
a
 
l
o
c
k
 
r
e
f
e
r
e
n
c
e
 
-
-
 
G
A
P
:
 
7
 
o
f
 
4
6
 
l
o
c
k
 
e
n
t
r
i
e
s
 
c
a
r
r
y
 
n
o
 
c
a
n
o
n
i
c
a
l
 
U
R
L
 
a
n
d
 
0
 
c
a
r
r
y
 
a
 
p
i
n
n
e
d
 
r
e
v
i
s
i
o
n
 
|


|
 
2
8
.
 
c
u
r
r
e
n
t
 
r
e
p
o
r
t
s
 
b
i
n
d
 
t
h
e
 
e
x
a
c
t
 
s
u
b
j
e
c
t
 
[
M
E
T
]
 
|
 
s
u
b
j
e
c
t
_
s
h
a
,
 
t
a
s
k
p
a
c
k
 
i
d
 
a
n
d
 
h
a
s
h
,
 
w
o
r
k
t
r
e
e
 
d
i
g
e
s
t
 
a
n
d
 
t
a
s
k
p
a
c
k
 
b
i
n
d
i
n
g
 
a
r
e
 
r
e
c
o
r
d
e
d
;
 
-
-
c
h
e
c
k
 
r
e
p
o
r
t
s
 
s
c
o
p
e
=
b
o
u
n
d
-
i
n
p
u
t
-
i
n
t
e
g
r
i
t
y
 
w
i
t
h
 
g
i
t
-
a
n
d
-
c
l
o
u
d
 
e
x
p
l
i
c
i
t
l
y
 
N
O
T
_
V
E
R
I
F
I
E
D
 
|


|
 
2
9
.
 
a
 
c
l
e
a
n
 
c
l
o
n
e
 
r
e
p
r
o
d
u
c
e
s
 
t
h
e
 
s
t
a
t
i
c
 
a
n
d
 
t
e
s
t
 
l
a
y
e
r
s
 
[
M
E
T
]
 
|
 
v
e
r
i
f
y
_
f
r
e
s
h
_
c
l
o
n
e
.
p
y
 
p
a
s
s
e
s
 
9
 
s
t
a
g
e
s
 
o
n
 
a
 
f
r
e
s
h
 
c
l
o
n
e
;
 
i
n
s
t
a
l
l
 
i
s
 
N
O
T
_
V
E
R
I
F
I
A
B
L
E
 
a
n
d
 
i
s
 
r
e
p
o
r
t
e
d
 
a
s
 
s
u
c
h
 
|


|
 
3
0
.
 
D
e
e
p
S
e
e
k
 
i
m
p
e
r
s
o
n
a
t
e
d
 
n
o
 
r
e
a
l
 
d
e
s
i
g
n
 
h
o
s
t
 
E
3
/
E
4
 
[
M
E
T
]
 
|
 
E
V
I
D
E
N
C
E
-
L
E
V
E
L
-
A
U
D
I
T
.
j
s
o
n
:
 
4
 
c
l
a
i
m
s
 
e
x
a
m
i
n
e
d
,
 
0
 
o
v
e
r
c
l
a
i
m
s
,
 
a
l
l
 
h
i
s
t
o
r
i
c
a
l
 
a
n
d
 
q
u
a
l
i
f
i
e
d
 
|


|
 
3
1
.
 
t
h
e
 
C
o
d
e
x
 
h
a
n
d
o
f
f
 
i
s
 
f
u
l
l
y
 
g
e
n
e
r
a
t
e
d
 
[
M
E
T
]
 
|
 
d
o
c
s
/
t
a
s
k
p
a
c
k
s
/
D
E
S
I
G
N
-
L
A
B
-
C
O
D
E
X
-
R
E
A
L
-
H
O
S
T
-
H
A
N
D
O
F
F
.
m
d
:
 
8
 
d
o
m
a
i
n
s
 
w
i
t
h
 
c
o
n
t
r
a
c
t
,
 
f
i
x
t
u
r
e
,
 
c
o
m
m
a
n
d
s
,
 
e
v
i
d
e
n
c
e
 
t
e
m
p
l
a
t
e
,
 
d
o
-
n
o
t
-
c
l
a
i
m
 
l
i
s
t
 
a
n
d
 
r
o
l
l
b
a
c
k
 
|


|
 
3
2
.
 
t
h
e
 
w
o
r
k
t
r
e
e
 
i
s
 
c
l
e
a
n
 
o
r
 
e
v
e
r
y
 
c
h
a
n
g
e
 
i
s
 
a
t
t
r
i
b
u
t
e
d
 
[
M
E
T
]
 
|
 
t
h
e
 
t
r
e
e
 
i
s
 
c
l
e
a
n
 
a
t
 
t
h
e
 
r
e
c
o
r
d
e
d
 
s
u
b
j
e
c
t
;
 
e
v
e
r
y
 
c
o
m
m
i
t
t
e
d
 
c
h
a
n
g
e
 
n
a
m
e
s
 
a
n
 
o
w
n
e
r
 
t
a
s
k
 
|


#
#
 
W
h
a
t
 
i
s
 
N
O
T
 
c
l
a
i
m
e
d




*
 
D
E
S
I
G
N
-
L
A
B
 
p
r
o
d
u
c
t
 
c
o
m
p
l
e
t
e


*
 
P
h
o
t
o
s
h
o
p
 
i
n
t
e
g
r
a
t
e
d
 
E
3


*
 
I
l
l
u
s
t
r
a
t
o
r
 
i
n
t
e
g
r
a
t
e
d
 
E
3


*
 
O
p
e
n
D
e
s
i
g
n
 
i
n
t
e
g
r
a
t
e
d
 
E
3


*
 
C
o
m
f
y
U
I
 
p
r
o
d
u
c
t
i
o
n
 
r
e
a
d
y


*
 
B
l
e
n
d
e
r
 
i
n
t
e
g
r
a
t
e
d


*
 
M
i
n
i
M
a
x
 
v
a
l
i
d
a
t
e
d


*
 
p
r
o
f
e
s
s
i
o
n
a
l
 
d
e
s
i
g
n
 
q
u
a
l
i
t
y
 
p
a
s
s
e
d


*
 
H
u
m
a
n
 
J
u
r
y
 
p
a
s
s
e
d


*
 
r
e
l
e
a
s
e
 
r
e
a
d
y


#
#
 
C
o
d
e
x
 
s
t
a
r
t
i
n
g
 
p
o
i
n
t




C
o
n
t
r
a
c
t
,
 
f
i
x
t
u
r
e
s
,
 
c
o
m
m
a
n
d
 
o
u
t
l
i
n
e
s
,
 
e
v
i
d
e
n
c
e
 
t
e
m
p
l
a
t
e
s
,
 
d
o
-
n
o
t
-
c
l
a
i
m
 
l
i
s
t
s
 
a
n
d
 
r
o
l
l
b
a
c
k
 
e
x
p
e
c
t
a
t
i
o
n
s
 
f
o
r
 
e
i
g
h
t
 
d
o
m
a
i
n
s
 
a
r
e
 
i
n
 
`
d
o
c
s
/
t
a
s
k
p
a
c
k
s
/
D
E
S
I
G
N
-
L
A
B
-
C
O
D
E
X
-
R
E
A
L
-
H
O
S
T
-
H
A
N
D
O
F
F
.
m
d
`
.


C
o
d
e
x
 
d
o
e
s
 
n
o
t
 
n
e
e
d
 
t
o
 
r
e
p
e
a
t
 
r
e
p
o
s
i
t
o
r
y
 
c
l
e
a
n
u
p
,
 
l
a
n
g
u
a
g
e
 
p
l
a
n
n
i
n
g
,
 
D
B
 
s
c
h
e
m
a
 
r
e
f
a
c
t
o
r
i
n
g
,
 
d
i
r
e
c
t
o
r
y
 
m
i
g
r
a
t
i
o
n
,
 
t
h
i
r
d
-
p
a
r
t
y
 
s
o
u
r
c
e
 
c
l
e
a
n
u
p
 
o
r
 
s
p
i
l
l
 
c
l
e
a
n
u
p
.

